import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Filter,
  CheckCircle2,
  XCircle,
  Calendar as CalendarIcon,
  AlertTriangle,
  Check,
  Pencil,
  Mars,
  Venus,
  Plus,
} from "lucide-react";
import { api, type NewTeam } from "@/lib/serverComm";
import { useTranslation } from "@/hooks/useTranslation";
import { Badge } from "@/components/ui/badge";
import { getLevelBadgeVariant, getGenderBadgeVariant } from "@/lib/badge-utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { TeamDetail } from "./TeamDetail";
import { UserAvatar } from "@/components/user-avatar";
import { ProfilePictureModal } from "@/components/ProfilePictureModal";

export function AdminAllTeams() {
  const { isAdmin } = useAuth();
  const { t } = useTranslation("teams");
  const { t: tCommon } = useTranslation("common");
  const { t: tNav } = useTranslation("navigation");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [level, setLevel] = useState<string>("all");
  const [paidStatus, setPaidStatus] = useState<string>("all");
  const [teamNameQuery, setTeamNameQuery] = useState<string>("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentTeamId, setPaymentTeamId] = useState<string | null>(null);
  const [paymentUserId, setPaymentUserId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentError, setPaymentError] = useState<string>("");
  // Per-team warning expansion state
  const [expandedWarnings, setExpandedWarnings] = useState<Record<string, boolean>>({});
  const [selectedEditTeamId, setSelectedEditTeamId] = useState<string | null>(null);
  const [selectedUserForPicture, setSelectedUserForPicture] = useState<{
    imageUrl: string;
    firstName?: string;
    lastName?: string;
    email: string;
  } | null>(null);
  // Create team modal state
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [createTeamName, setCreateTeamName] = useState("");
  const [createTeamLevel, setCreateTeamLevel] = useState<string>("");
  const [createTeamGender, setCreateTeamGender] = useState<string>("");
  const [createTeamLoading, setCreateTeamLoading] = useState(false);
  const [createTeamError, setCreateTeamError] = useState<string | null>(null);

  const loadTeams = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getAdminTeams({
        level: level === "all" ? undefined : level,
      });
      if (response.error) {
        setError(response.error);
      } else {
        setTeams(response.teams || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load teams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  // Gender map for converting display values to backend values
  const genderMap: Record<string, string> = {
    "Masculine": "male",
    "Femenine": "female",
    "Mixed": "mixed"
  };

  // Admin team creation: Creates empty teams with no members.
  // Backend will skip gender validation and member addition for admins.
  // Admins can then edit the team to add members using the existing edit functionality.
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createTeamName.trim() || !createTeamLevel || !createTeamGender) {
      setCreateTeamError(t('pleaseFillAllFields'));
      return;
    }

    try {
      setCreateTeamLoading(true);
      setCreateTeamError(null);

      const teamData: NewTeam = {
        name: createTeamName.trim(),
        level: createTeamLevel,
        gender: genderMap[createTeamGender],
      };

      // Backend detects admin status and creates empty team (no members, no gender validation)
      const response = await api.createTeam(teamData);
      
      if (response.error) {
        setCreateTeamError(response.error);
      } else {
        // Reset form and close modal
        setCreateTeamName("");
        setCreateTeamLevel("");
        setCreateTeamGender("");
        setShowCreateTeamModal(false);
        // Show success toast
        toast.success("Team created");
        // Refresh teams list
        loadTeams();
      }
    } catch (err) {
      setCreateTeamError(t('failedToCreateTeam'));
      console.error("Error creating team:", err);
    } finally {
      setCreateTeamLoading(false);
    }
  };

  const handleMarkPaid = async (
    teamId: string,
    userId: string,
    currentPaid: boolean,
    desiredPaid: boolean
  ) => {
    if (!currentPaid && desiredPaid) {
      // Going from unpaid to paid, open modal (as before)
      setPaymentTeamId(teamId);
      setPaymentUserId(userId);
      setPaymentAmount("");
      setPaymentError("");
      setShowPaymentDialog(true);
    } else if (currentPaid && !desiredPaid) {
      // Going from paid to unpaid
      try {
        setError(null);
        await api.updateMemberPaid(teamId, userId, { paid: false });
        await loadTeams();
      } catch (err: any) {
        setError(err.message || "Failed to update payment status");
      }
    }
  };

  const handlePaymentDialogConfirm = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setPaymentError(t("amountPaid") + ": " + t("pleaseFillAllFields"));
      return;
    }
    if (paymentTeamId && paymentUserId) {
      try {
        setError(null);
        await api.updateMemberPaid(paymentTeamId, paymentUserId, { paid: true, paid_amount: amount });
        setShowPaymentDialog(false);
        setPaymentError("");
        setPaymentAmount("");
        await loadTeams();
      } catch (err: any) {
        setPaymentError(err.message || tCommon("error"));
      }
    }
  };

  // Helper: availability check logic
  function getAvailabilityWarning(team: any) {
    const days = team.availability || [];
    if (!days.length) return true;
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const weekends = ['saturday', 'sunday'];
    const availableWeekdays = days.filter((d: any) => weekdays.includes(d.day_of_week) && d.is_available);
    const availableWeekends = days.filter((d: any) => weekends.includes(d.day_of_week) && d.is_available);
    const hasMinWeekdays = availableWeekdays.length >= 3;
    const hasLateWeekday = availableWeekdays.some((d: any) => {
      if (!d.end_time) return false;
      const [h] = d.end_time.split(':').map(Number);
      return h >= 21;
    });
    const hasValidWeekend = availableWeekends.some((d: any) => {
      if (!d.start_time || !d.end_time) return false;
      const [sh] = d.start_time.split(':').map(Number);
      const [eh] = d.end_time.split(':').map(Number);
      return sh <= 9 && eh >= 12;
    });
    return !(hasMinWeekdays && (hasLateWeekday || hasValidWeekend));
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{tNav('teamManagement')}</h1>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setShowCreateTeamModal(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('createTeam')}
          </Button>
        )}
      </div>

      {/* Compact filters */}
      <Card className="mb-6">
        <CardHeader className="p-3 pt-2 pb-2">
          {/* Compact filter row: icon and dropdowns inline */}
          <div className="flex flex-row items-center gap-2">
            <Filter className="w-5 h-5" />
            <div className="min-w-[100px]">
              <Label className="text-xs">
                {t("teamName")}
              </Label>
              <Input
                value={teamNameQuery}
                onChange={(e) => setTeamNameQuery(e.target.value)}
                placeholder={tCommon('name')}
                aria-label={t("teamName")}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">
                {t("level")}
              </Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger aria-label={t("selectLevel")}>
                  <SelectValue placeholder={t("selectLevel")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tCommon('all')}</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">
                {t("paymentStatus")}
              </Label>
              <Select value={paidStatus} onValueChange={setPaidStatus}>
                <SelectTrigger aria-label={t("paymentStatus")}>
                  <SelectValue placeholder={t("paymentStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tCommon('all')}</SelectItem>
                  <SelectItem value="paid">{t('paid')}</SelectItem>
                  <SelectItem value="notPaid">{tCommon('notPaid')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        {/* No filter content – now included in header row above */}
      </Card>

      {error && (
        <div className="mb-6 p-3 border border-destructive/20 bg-destructive/10 rounded-md">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading teams...
        </div>
      ) : (
        <>
          {(() => {
            const filteredTeams = teams.filter((item) => {
              // Team name filter
              if (teamNameQuery.trim().length > 0) {
                const matchesName = (item.team?.name || "")
                  .toLowerCase()
                  .includes(teamNameQuery.trim().toLowerCase());
                if (!matchesName) return false;
              }

              // Paid status filter
              if (paidStatus !== "all") {
                const members = item.members || [];
                if (members.length === 0) {
                  // Teams with no members are considered "notPaid"
                  return paidStatus === "notPaid";
                }
                
                const allMembersPaid = members.every((m: any) => m.member?.paid === true);
                
                if (paidStatus === "paid") {
                  // Paid teams: all members must be paid
                  return allMembersPaid;
                } else if (paidStatus === "notPaid") {
                  // Not paid teams: at least one member is not paid
                  return !allMembersPaid;
                }
              }

              return true;
            });

            if (filteredTeams.length === 0) {
              return (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{t('noTeamsFound') || 'No teams found'}</h3>
                  </CardContent>
                </Card>
              );
            }

            return (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredTeams.map((item) => {
            // Team incomplete/concern logic (mimic TeamDetail)
            let teamWarningMsg = "";
            const members = item.members || [];
            const gender = item.team.gender;
            const minPlayers = 2;
            const maleCount = members.filter((m: any) => m.user.gender === "male").length;
            const femaleCount = members.filter((m: any) => m.user.gender === "female").length;
            if (members.length < minPlayers) {
              teamWarningMsg = t("teamIncompleteMinPlayers");
            } else if (gender === "mixed") {
              if (maleCount === 0 && femaleCount === 0) {
                teamWarningMsg = t("teamIncompleteMixedMissingBoth");
              } else if (maleCount === 0) {
                teamWarningMsg = t("teamIncompleteMixedMissingMale");
              } else if (femaleCount === 0) {
                teamWarningMsg = t("teamIncompleteMixedMissingFemale");
              }
            }

            return (
              <Card key={item.team.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="p-5">
                  <CardTitle className="text-lg md:text-lg flex flex-row md:flex-col md:items-start items-center justify-between md:gap-2">
                    <span>{item.team.name}</span>
                    <span className="flex items-center gap-2">
                      <Badge variant={getLevelBadgeVariant(item.team.level)}>
                        {tCommon('level')} {item.team.level}
                      </Badge>
                      <Badge variant={getGenderBadgeVariant(item.team.gender)}>
                        {item.team.gender === "male"
                          ? t("masculine")
                          : item.team.gender === "female"
                          ? t("femenine")
                          : t("mixed")}
                      </Badge>
                      {(teamWarningMsg || getAvailabilityWarning(item.team)) && (
                        <button
                          className={
                            'transition-colors p-1 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-900/30 ' +
                            (expandedWarnings[item.team.id] ? 'ring-2 ring-yellow-500' : '')
                          }
                          onClick={() => setExpandedWarnings(x => ({ ...x, [item.team.id]: !x[item.team.id] }))}
                          title={t('availabilityWarningTitle')}
                          aria-label={t('availabilityWarningTitle')}
                          type="button"
                        >
                          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        </button>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="transition-colors p-1 rounded-full hover:bg-accent border border-border ml-1"
                            onClick={() => setSelectedEditTeamId(item.team.id)}
                            title={tCommon('edit')}
                            aria-label={tCommon('edit')}
                            type="button"
                          >
                            <Pencil className="w-5 h-5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{tCommon('edit')}</TooltipContent>
                      </Tooltip>
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {/* warning panel (expanded when toggled via header icon) */}
                  {expandedWarnings[item.team.id] && (teamWarningMsg || getAvailabilityWarning(item.team)) && (
                    <div className="mb-4 space-y-2">
                      {getAvailabilityWarning(item.team) && (
                        <div className="p-3 border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10 rounded-md flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-1">{t('availabilityWarningTitle')}</div>
                            <div className="text-xs text-yellow-700 dark:text-yellow-300 whitespace-pre-line">{t('availabilityWarningDescription')}</div>
                          </div>
                        </div>
                      )}
                      {teamWarningMsg && (
                        <div className="p-3 border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10 rounded-md flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-yellow-800 dark:text-yellow-200">{teamWarningMsg}</div>
                        </div>
                      )}
                    </div>
                  )}
                  {item.members.length === 0 ? (
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Users className="w-4 h-4" /> No members
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {item.members.map(({ member, user }: any) => {
                        // Handle case where user might be null (data integrity issue)
                        if (!user || !user.id) {
                          return (
                            <div key={member.id} className="p-3 border rounded-md border-destructive/50">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <UserAvatar
                                      user={{
                                        photo_url: null,
                                        profile_picture_url: null,
                                        first_name: null,
                                        last_name: null,
                                        email: `User ${member.user_id}`,
                                      }}
                                      size="sm"
                                    />
                                  </div>
                                  <div>
                                    <div className="font-medium text-muted-foreground">
                                      {tCommon('unknownUser')} ({member.user_id.substring(0, 8)}...)
                                    </div>
                                    <div className="text-sm text-muted-foreground">{tCommon('userNotFound') || 'User not found'}</div>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end min-w-0">
                                  <div className="flex items-center gap-2">
                                    {member.paid ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="inline-flex items-center gap-1 text-green-600 text-sm cursor-pointer">
                                            <CheckCircle2 className="w-4 h-4" />
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">{t('paid')}</TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="inline-flex items-center gap-1 text-red-600 text-sm cursor-pointer">
                                            <XCircle className="w-4 h-4" />
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">{tCommon('notPaid')}</TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={member.id} className="p-3 border rounded-md">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <UserAvatar
                                    user={{
                                      photo_url: null,
                                      profile_picture_url: user.profile_picture_url,
                                      first_name: user.first_name,
                                      last_name: user.last_name,
                                      email: user.email,
                                    }}
                                    size="sm"
                                    className={user.profile_picture_url ? "cursor-pointer hover:opacity-80 transition-opacity" : undefined}
                                    onClick={user.profile_picture_url ? () => {
                                      setSelectedUserForPicture({
                                        imageUrl: user.profile_picture_url,
                                        firstName: user.first_name,
                                        lastName: user.last_name,
                                        email: user.email,
                                      });
                                    } : undefined}
                                  />
                                  {user.gender && (
                                    <div className="flex-shrink-0">
                                      {user.gender === "male" ? (
                                        <Mars className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                      ) : user.gender === "female" ? (
                                        <Venus className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div 
                                    className={user.profile_picture_url ? "font-medium cursor-pointer hover:underline" : "font-medium"}
                                    onClick={user.profile_picture_url ? () => {
                                      setSelectedUserForPicture({
                                        imageUrl: user.profile_picture_url,
                                        firstName: user.first_name,
                                        lastName: user.last_name,
                                        email: user.email,
                                      });
                                    } : undefined}
                                  >
                                    {user.display_name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email}
                                  </div>
                                  {/* <div className="text-xs text-muted-foreground">{user.email}</div> */}
                                </div>
                              </div>
                            <div className="flex flex-col items-end min-w-0">
                              <div className="flex items-center gap-2">
                                {member.paid ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex items-center gap-1 text-green-600 text-sm cursor-pointer">
                                        <CheckCircle2 className="w-4 h-4" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">{t('paid')}</TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex items-center gap-1 text-amber-600 text-sm cursor-pointer">
                                        <XCircle className="w-4 h-4" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">{tCommon('notPaid')}</TooltipContent>
                                  </Tooltip>
                                )}
                                <Switch
                                  checked={!!member.paid}
                                  onCheckedChange={(checked) => {
                                    handleMarkPaid(item.team.id, user.id, !!member.paid || false, checked);
                                  }}
                                  id={`switch-paid-${item.team.id}-${user.id}`}
                                  aria-label={t('paid')}
                                />
                              </div>
                              {member.paid && (
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 pl-7">
                                  <span className="inline-flex items-center gap-1">
                                    {member.paid_amount ?? 0}€
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <CalendarIcon className="w-3 h-3" />{member.paid_at ? new Date(member.paid_at).toLocaleDateString() : ""}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
                );
              })}
              </div>
            );
          })()}
        </>
      )}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("markPaid")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <input
              autoFocus
              type="number"
              min={0.01}
              step="any"
              className="input input-bordered w-full p-2 border rounded"
              value={paymentAmount}
              onChange={e => setPaymentAmount(e.target.value)}
              placeholder={t("amountPaid")}
            />
            {paymentError && (
              <div className="text-destructive text-xs">{paymentError}</div>
            )}
          </div>
          <DialogFooter>
            <div className="flex w-full gap-6 justify-center mt-3">
              <DialogClose asChild>
                <button
                  className="btn btn-outline flex items-center justify-center w-11 h-11 rounded border"
                  type="button"
                  title={tCommon("cancel")}
                  aria-label={tCommon("cancel")}
                >
                  <XCircle className="w-5 h-5 text-red-600" />
                </button>
              </DialogClose>
              <button
                className="btn btn-primary flex items-center justify-center w-11 h-11 rounded border"
                type="button"
                onClick={handlePaymentDialogConfirm}
                title={t("markPaid")}
                aria-label={t("markPaid")}
              >
                <Check className="w-5 h-5 text-green-600" />
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!selectedEditTeamId} onOpenChange={(open) => {
        if (!open) {
          setSelectedEditTeamId(null);
          loadTeams();
        }
      }}>
        <DialogContent className="max-w-3xl min-h-[60vh] max-h-[90vh] overflow-y-auto p-2 [&_[data-slot=dialog-close]]:border [&_[data-slot=dialog-close]]:border-border [&_[data-slot=dialog-close]]:p-1.5 [&_[data-slot=dialog-close]]:bg-background">
          <DialogHeader>
            <DialogTitle className="sr-only">
              {(() => {
                const st = teams.find((it) => it.team?.id === selectedEditTeamId);
                return st?.team?.name || tCommon('edit');
              })()}
            </DialogTitle>
          </DialogHeader>
          {selectedEditTeamId && (
            <TeamDetail
              teamId={selectedEditTeamId}
              embedded={true}
              forceAdmin={true}
              onClose={() => {
                setSelectedEditTeamId(null);
                loadTeams();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={showCreateTeamModal} onOpenChange={(open) => {
        if (!open) {
          setShowCreateTeamModal(false);
          setCreateTeamName("");
          setCreateTeamLevel("");
          setCreateTeamGender("");
          setCreateTeamError(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('createTeam')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTeam} className="space-y-4">
            {createTeamError && (
              <div className="p-4 border border-destructive/20 bg-destructive/10 rounded-md">
                <p className="text-destructive text-sm">{createTeamError}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="createTeamName">{t('teamName')}</Label>
              <Input
                id="createTeamName"
                value={createTeamName}
                onChange={(e) => setCreateTeamName(e.target.value)}
                placeholder={t('teamNamePlaceholder')}
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="createTeamLevel">{t('selectLevel')}</Label>
              <Select value={createTeamLevel} onValueChange={setCreateTeamLevel}>
                <SelectTrigger id="createTeamLevel">
                  <SelectValue placeholder={t('selectLevel')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="createTeamGender">{t('selectGender')}</Label>
              <Select value={createTeamGender} onValueChange={setCreateTeamGender}>
                <SelectTrigger id="createTeamGender">
                  <SelectValue placeholder={t('selectGender')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Masculine">{t('masculine')}</SelectItem>
                  <SelectItem value="Femenine">{t('femenine')}</SelectItem>
                  <SelectItem value="Mixed">{t('mixed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={createTeamLoading}>
                  {tCommon('cancel')}
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={createTeamLoading || !createTeamName.trim() || !createTeamLevel || !createTeamGender}
              >
                {createTeamLoading ? t('creatingTeam') : t('createTeam')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {selectedUserForPicture && (
        <ProfilePictureModal
          open={!!selectedUserForPicture}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedUserForPicture(null);
            }
          }}
          imageUrl={selectedUserForPicture.imageUrl}
          firstName={selectedUserForPicture.firstName}
          lastName={selectedUserForPicture.lastName}
          email={selectedUserForPicture.email}
        />
      )}
    </div>
  );
}
