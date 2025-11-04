import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  api,
  League,
  NewLeague,
  UpdateLeague,
} from "@/lib/serverComm";
import {
  validateLeague,
  getFieldError,
  hasFieldError,
} from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getLevelBadgeVariant, getGenderBadgeVariant } from "@/lib/badge-utils";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { UserAvatar } from "@/components/user-avatar";
import { Plus, Edit, Trash2, Calendar, Users, Shield, X, ChevronDown, ChevronUp, Search, Wallet, XCircle, Mars, Venus, Calendar as CalendarIcon, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";
import { TeamDetail } from "./TeamDetail";

export function AdminLeagues() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('leagues');
  const { t: tCommon } = useTranslation('common');
  const { t: tTeams } = useTranslation('teams');

  // State for leagues
  const [leagues, setLeagues] = useState<League[]>([]);
  const [leaguesLoading, setLeaguesLoading] = useState(false);
  const [leaguesError, setLeaguesError] = useState("");

  // Form states
  const [showCreateLeague, setShowCreateLeague] = useState(false);
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [deleteConfirmLeague, setDeleteConfirmLeague] = useState<League | null>(
    null
  );

  // Form data
  const [leagueForm, setLeagueForm] = useState<NewLeague>({
    name: "",
    level: "2",
    gender: "mixed",
    start_date: "",
    end_date: "",
  });

  // Team management state
  const [leagueTeamsMap, setLeagueTeamsMap] = useState<Record<string, any[]>>({});
  const [teamsLoadingMap, setTeamsLoadingMap] = useState<Record<string, boolean>>({});
  const [expandedLeagues, setExpandedLeagues] = useState<Set<string>>(new Set());
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [selectedLeagueForAdd, setSelectedLeagueForAdd] = useState<League | null>(null);
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showRemoveTeamConfirm, setShowRemoveTeamConfirm] = useState(false);
  const [pendingRemoveTeam, setPendingRemoveTeam] = useState<{ leagueId: string; teamId: string } | null>(null);
  const [selectedTeamInfo, setSelectedTeamInfo] = useState<{ teamId: string; leagueId: string } | null>(null);
  const editLeagueNameInputRef = useRef<HTMLInputElement>(null);
  
  // Payment details modal state (read-only)
  const [showPaymentDetailsDialog, setShowPaymentDetailsDialog] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{ amount: number | null; date: string | null } | null>(null);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  // Validation errors
  const [leagueErrors, setLeagueErrors] = useState<any[]>([]);

  // Redirect if not admin
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/", { state: { error: t('adminAccessRequired') } });
    }
  }, [isAdmin, loading, navigate]);

  // Load leagues on mount
  useEffect(() => {
    if (isAdmin) {
      loadLeagues();
    }
  }, [isAdmin]);

  // Load teams for expanded leagues when leagues data is available
  useEffect(() => {
    if (leagues.length > 0 && expandedLeagues.size > 0) {
      expandedLeagues.forEach((leagueId) => {
        if (!leagueTeamsMap[leagueId] && !teamsLoadingMap[leagueId]) {
          loadLeagueTeams(leagueId);
        }
      });
    }
  }, [leagues, expandedLeagues]);

  // Prevent text selection when edit dialog opens
  useEffect(() => {
    if (editingLeague && editLeagueNameInputRef.current) {
      // Small delay to ensure input is rendered and prevent auto-selection
      setTimeout(() => {
        if (editLeagueNameInputRef.current) {
          // Move cursor to end instead of selecting all text
          const length = editLeagueNameInputRef.current.value.length;
          editLeagueNameInputRef.current.setSelectionRange(length, length);
        }
      }, 150);
    }
  }, [editingLeague]);

  const loadLeagues = async () => {
    setLeaguesLoading(true);
    setLeaguesError("");
    try {
      const response = await api.getLeagues();
      setLeagues(response.leagues);
    } catch (error) {
      console.error("Failed to load leagues:", error);
      setLeaguesError(t('failedToLoadLeagues'));
    } finally {
      setLeaguesLoading(false);
    }
  };

  const handleCreateLeague = async () => {
    const validation = validateLeague(leagueForm);
    if (!validation.isValid) {
      setLeagueErrors(validation.errors);
      return;
    }

    if (!leagueForm.level || !leagueForm.gender) {
      setLeagueErrors([
        { field: "general", message: t('levelAndGenderRequired') || "Level and gender are required" },
      ]);
      return;
    }

    try {
      await api.createLeague(leagueForm);
      setShowCreateLeague(false);
      setLeagueForm({ name: "", level: "2", gender: "mixed", start_date: "", end_date: "" });
      setLeagueErrors([]);
      toast.success(t('leagueCreated'));
      loadLeagues();
    } catch (error: any) {
      console.error("Failed to create league:", error);
      setLeagueErrors([
        { field: "general", message: error.error || t('failedToCreateLeague') },
      ]);
    }
  };

  const handleUpdateLeague = async () => {
    if (!editingLeague) return;

    const updateData: UpdateLeague = {};
    if (leagueForm.name !== editingLeague.name)
      updateData.name = leagueForm.name;
    // Level and gender cannot be edited for existing leagues
    if (leagueForm.start_date !== editingLeague.start_date)
      updateData.start_date = leagueForm.start_date;
    if (leagueForm.end_date !== editingLeague.end_date)
      updateData.end_date = leagueForm.end_date;

    const validation = validateLeague(leagueForm);
    if (!validation.isValid) {
      setLeagueErrors(validation.errors);
      return;
    }

    try {
      await api.updateLeague(editingLeague.id, updateData);
      setEditingLeague(null);
      setLeagueForm({ name: "", level: "2", gender: "mixed", start_date: "", end_date: "" });
      setLeagueErrors([]);
      toast.success(t('leagueUpdated') || "League updated successfully");
      loadLeagues();
    } catch (error: any) {
      console.error("Failed to update league:", error);
      setLeagueErrors([
        { field: "general", message: error.error || t('failedToUpdateLeague') },
      ]);
    }
  };

  const handleDeleteLeague = async () => {
    if (!deleteConfirmLeague) return;

    try {
      const response = await api.deleteLeague(deleteConfirmLeague.id);
      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success(t('leagueDeleted'));
        setDeleteConfirmLeague(null);
        loadLeagues();
      }
    } catch (error: any) {
      console.error("Failed to delete league:", error);
      toast.error(error.message || t('failedToDeleteLeague') || 'Failed to delete league');
    }
  };

  const startEditLeague = (league: League) => {
    setEditingLeague(league);
    setLeagueForm({
      name: league.name,
      level: league.level,
      gender: league.gender,
      start_date: league.start_date,
      end_date: league.end_date,
    });
    setLeagueErrors([]);
    // Prevent text selection by deselecting after a short delay
    setTimeout(() => {
      if (window.getSelection) {
        window.getSelection()?.removeAllRanges();
      }
    }, 0);
  };

  const loadLeagueTeams = async (leagueId: string, forceRefresh: boolean = false) => {
    // Prevent duplicate loads unless force refresh is requested
    if (!forceRefresh && (leagueTeamsMap[leagueId] || teamsLoadingMap[leagueId])) return;
    
    setTeamsLoadingMap(prev => ({ ...prev, [leagueId]: true }));
    try {
      const response = await api.getAdminTeamsByLeague(leagueId);
      setLeagueTeamsMap(prev => ({ ...prev, [leagueId]: response.teams || [] }));
    } catch (error) {
      console.error("Failed to load teams:", error);
      toast.error(t('failedToLoadTeams') || "Failed to load teams");
    } finally {
      setTeamsLoadingMap(prev => ({ ...prev, [leagueId]: false }));
    }
  };

  const handleToggleTeams = (leagueId: string) => {
    const newExpanded = new Set(expandedLeagues);
    if (newExpanded.has(leagueId)) {
      newExpanded.delete(leagueId);
    } else {
      newExpanded.add(leagueId);
      // Set loading state immediately to prevent flash of "no teams" message
      if (!teamsLoadingMap[leagueId] && !leagueTeamsMap[leagueId]) {
        setTeamsLoadingMap(prev => ({ ...prev, [leagueId]: true }));
      }
      loadLeagueTeams(leagueId);
    }
    setExpandedLeagues(newExpanded);
  };

  const openAddTeamModal = async (league: League) => {
    setSelectedLeagueForAdd(league);
    setSearchTerm("");
    setAvailableTeams([]);
    try {
      // Load teams in this league if not already loaded
      let teamsInThisLeague: string[] = [];
      if (!leagueTeamsMap[league.id]) {
        const leagueTeamsResponse = await api.getAdminTeamsByLeague(league.id);
        const teams = leagueTeamsResponse.teams || [];
        setLeagueTeamsMap(prev => ({ ...prev, [league.id]: teams }));
        teamsInThisLeague = teams.map((t: any) => t.team.id);
      } else {
        teamsInThisLeague = (leagueTeamsMap[league.id] || []).map((t: any) => t.team.id);
      }
      
      // Load available teams (teams with matching level and gender, not in active leagues)
      const availableResponse = await api.getAdminTeams({
        level: league.level,
        gender: league.gender,
      });
      // Filter out teams already in this league
      setAvailableTeams((availableResponse.teams || []).filter((team: any) => {
        const teamId = team.team?.id || team.id;
        return !teamsInThisLeague.includes(teamId);
      }));
      setShowAddTeamModal(true);
    } catch (error) {
      console.error("Failed to load available teams:", error);
      toast.error(t('failedToLoadTeams') || "Failed to load teams");
    }
  };

  const handleAddTeam = async (teamId: string) => {
    if (!selectedLeagueForAdd) return;

    try {
      await api.addTeamToLeague(selectedLeagueForAdd.id, teamId);
      toast.success(t('teamAdded') || "Team added to league");
      
      // Refresh teams for this league
      const response = await api.getAdminTeamsByLeague(selectedLeagueForAdd.id);
      setLeagueTeamsMap(prev => ({ ...prev, [selectedLeagueForAdd.id]: response.teams || [] }));
      
      // Refresh available teams list (exclude teams already in this league)
      const availableResponse = await api.getAdminTeams({
        level: selectedLeagueForAdd.level,
        gender: selectedLeagueForAdd.gender,
      });
      const teamsInThisLeague = (response.teams || []).map((t: any) => t.team.id);
      const teamData = availableResponse.teams || [];
      setAvailableTeams(teamData.filter((team: any) => {
        const teamIdToCheck = team.team?.id || team.id;
        return !teamsInThisLeague.includes(teamIdToCheck);
      }));
      
      // Clear search term to show all available teams
      setSearchTerm("");
    } catch (error: any) {
      console.error("Failed to add team:", error);
      toast.error(error.error || t('failedToAddTeam') || "Failed to add team to league");
    }
  };

  const handleRemoveTeamClick = (leagueId: string, teamId: string) => {
    setPendingRemoveTeam({ leagueId, teamId });
    setShowRemoveTeamConfirm(true);
  };

  const handleRemoveTeam = async () => {
    if (!pendingRemoveTeam) return;

    const { leagueId, teamId } = pendingRemoveTeam;
    setShowRemoveTeamConfirm(false);

    try {
      await api.removeTeamFromLeague(leagueId, teamId);
      toast.success(t('teamRemoved') || "Team removed from league");
      // Refresh teams for this league
      const response = await api.getAdminTeamsByLeague(leagueId);
      setLeagueTeamsMap(prev => ({ ...prev, [leagueId]: response.teams || [] }));
    } catch (error: any) {
      console.error("Failed to remove team:", error);
      toast.error(error.error || t('failedToRemoveTeam') || "Failed to remove team from league");
    } finally {
      setPendingRemoveTeam(null);
    }
  };


  const handleToggleTeamMembers = (teamId: string) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamId)) {
      newExpanded.delete(teamId);
    } else {
      newExpanded.add(teamId);
    }
    setExpandedTeams(newExpanded);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center">{tCommon('loading')}</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect
  }

  return (
    <div className="container mx-auto p-4 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('leagueManagement')}</h1>
          <p className="text-muted-foreground">{t('manageAllLeagues')}</p>
        </div>
        <Button onClick={() => setShowCreateLeague(true)}>
          <Plus className="w-4 h-4 mr-2" />
{t('createLeague')}
        </Button>
      </div>

      {/* Leagues Section */}
      {leaguesLoading ? (
        <div className="text-center py-4">{t('loadingLeagues')}</div>
      ) : leaguesError ? (
        <div className="text-center text-red-500 py-4">{leaguesError}</div>
      ) : leagues.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{t('noLeaguesFound')}</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {leagues.map((league) => (
            <Card key={league.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">{league.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {new Date(league.start_date).toLocaleDateString()} - {new Date(league.end_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getLevelBadgeVariant(league.level)}>
                      {tCommon('level')} {league.level}
                    </Badge>
                    <Badge variant={getGenderBadgeVariant(league.gender)}>
                      {league.gender === 'male' ? tTeams('masculine') : league.gender === 'female' ? tTeams('femenine') : tTeams('mixed')}
                    </Badge>
                  </div>
                  
                  {/* Teams Collapsible Section */}
                  <Collapsible
                    open={expandedLeagues.has(league.id)}
                    onOpenChange={() => handleToggleTeams(league.id)}
                  >
                    <div className="border-t pt-3 mt-3">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full justify-between">
                          <span className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            <span>
                              {t('teams')}
                              {expandedLeagues.has(league.id) && leagueTeamsMap[league.id] && (
                                <> ({leagueTeamsMap[league.id].length})</>
                              )}
                            </span>
                          </span>
                          {expandedLeagues.has(league.id) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 mt-2">
                        {teamsLoadingMap[league.id] ? (
                          <div className="text-center py-4 text-sm text-muted-foreground">
                            {tCommon('loading')}
                          </div>
                        ) : !leagueTeamsMap[league.id] ? (
                          <div className="text-center py-4 text-sm text-muted-foreground">
                            {tCommon('loading')}
                          </div>
                        ) : leagueTeamsMap[league.id].length === 0 ? (
                          <div className="text-center py-4 text-sm text-muted-foreground">
                            {t('noTeamsInLeague') || "No teams in this league yet"}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {leagueTeamsMap[league.id].map((item: any) => (
                              <div key={item.team.id} className="border rounded-md">
                                {/* Team Header */}
                                <div className="flex items-center justify-between p-2">
                                  <div
                                    onClick={() => handleToggleTeamMembers(item.team.id)}
                                    className="flex-1 cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2"
                                  >
                                    {expandedTeams.has(item.team.id) ? (
                                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                    )}
                                    <div>
                                      <p className="font-medium text-sm">{item.team.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {t('members') || "Members"}: {item.member_count || 0}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedTeamInfo({ teamId: item.team.id, leagueId: league.id });
                                      }}
                                      className="h-8 w-8 p-0 border border-border"
                                      title={tTeams('teamDetails') || "View team details"}
                                    >
                                      <Users className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveTeamClick(league.id, item.team.id);
                                      }}
                                      className="h-8 w-8 p-0 border border-border"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                                
                                {/* Team Members Collapsible */}
                                <Collapsible
                                  open={expandedTeams.has(item.team.id)}
                                  onOpenChange={() => handleToggleTeamMembers(item.team.id)}
                                >
                                  <CollapsibleContent className="px-2 pb-2">
                                    {item.members && item.members.length > 0 ? (
                                      <div className="space-y-2 pt-2 border-t">
                                        {item.members.map(({ member, user }: any) => {
                                          // Handle case where user might be null (data integrity issue)
                                          if (!user || !user.id) {
                                            return (
                                              <div key={member.id} className="p-2 border rounded-md border-destructive/50">
                                                <div className="flex items-center justify-between">
                                                  <div className="flex items-center gap-2">
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
                                                    <div>
                                                      <div className="font-medium text-sm text-muted-foreground">
                                                        {tCommon('unknownUser')} ({member.user_id.substring(0, 8)}...)
                                                      </div>
                                                      <div className="text-xs text-muted-foreground">{tCommon('userNotFound') || 'User not found'}</div>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          }

                                          return (
                                            <div key={member.id} className="p-2 border rounded-md">
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                  <UserAvatar
                                                    user={{
                                                      photo_url: null,
                                                      profile_picture_url: user.profile_picture_url,
                                                      first_name: user.first_name,
                                                      last_name: user.last_name,
                                                      email: user.email,
                                                    }}
                                                    size="sm"
                                                  />
                                                  {user.gender && (
                                                    <div className="flex-shrink-0">
                                                      {user.gender === "male" ? (
                                                        <Mars className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                      ) : user.gender === "female" ? (
                                                        <Venus className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                                                      ) : null}
                                                    </div>
                                                  )}
                                                  <div className="min-w-0 flex-1">
                                                    <div className="font-medium text-sm truncate">
                                                      {user.display_name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email}
                                                    </div>
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-2 min-w-0 ml-2">
                                                  {member.paid ? (
                                                    <>
                                                      <button
                                                        onClick={() => {
                                                          setPaymentDetails({
                                                            amount: member.paid_amount ? parseFloat(member.paid_amount) : null,
                                                            date: member.paid_at || null
                                                          });
                                                          setShowPaymentDetailsDialog(true);
                                                        }}
                                                        className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1"
                                                      >
                                                        {member.paid_amount ?? 0}€
                                                        <Info className="w-3 h-3" />
                                                      </button>
                                                      <Tooltip>
                                                        <TooltipTrigger asChild>
                                                          <button
                                                            onClick={() => {
                                                              setPaymentDetails({
                                                                amount: member.paid_amount ? parseFloat(member.paid_amount) : null,
                                                                date: member.paid_at || null
                                                              });
                                                              setShowPaymentDetailsDialog(true);
                                                            }}
                                                            className="inline-flex items-center gap-1 text-green-600 text-sm cursor-pointer hover:opacity-80 transition-opacity"
                                                          >
                                                            <Wallet className="w-4 h-4" />
                                                          </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top">{tCommon('paid')}</TooltipContent>
                                                      </Tooltip>
                                                    </>
                                                  ) : (
                                                    <div className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1">
                                                      <span>{tCommon('notPaid')}</span>
                                                      <XCircle className="w-4 h-4 text-amber-600" />
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="pt-2 pb-2 text-center text-sm text-muted-foreground">
                                        {tTeams('noMembers') || "No members in this team"}
                                      </div>
                                    )}
                                  </CollapsibleContent>
                                </Collapsible>
                              </div>
                            ))}
                          </div>
                        )}
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2 pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openAddTeamModal(league)}
                  className="flex-1 min-h-[44px]"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {t('addTeam') || "Add Team"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startEditLeague(league)}
                  className="min-h-[44px] min-w-[44px]"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteConfirmLeague(league)}
                  className="min-h-[44px] min-w-[44px]"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}


      {/* Create League Dialog */}
      <Dialog open={showCreateLeague} onOpenChange={setShowCreateLeague}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('createNewLeague')}</DialogTitle>
            <DialogDescription>
              {t('enterLeagueDetails')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="league-name">{t('leagueName')}</Label>
              <Input
                id="league-name"
                value={leagueForm.name}
                onChange={(e) =>
                  setLeagueForm({ ...leagueForm, name: e.target.value })
                }
                className={
                  hasFieldError(leagueErrors, "name") ? "border-red-500" : ""
                }
              />
              {getFieldError(leagueErrors, "name") && (
                <p className="text-sm text-red-500 mt-1">
                  {getFieldError(leagueErrors, "name")}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="league-level">{t('leagueLevel') || "Level"}</Label>
              <Select
                value={leagueForm.level}
                onValueChange={(value) =>
                  setLeagueForm({ ...leagueForm, level: value as "2" | "3" | "4" })
                }
              >
                <SelectTrigger className={hasFieldError(leagueErrors, "level") ? "border-red-500" : ""}>
                  <SelectValue placeholder={t('selectLevel') || "Select level"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">{tCommon('level2')}</SelectItem>
                  <SelectItem value="3">{tCommon('level3')}</SelectItem>
                  <SelectItem value="4">{tCommon('level4')}</SelectItem>
                </SelectContent>
              </Select>
              {getFieldError(leagueErrors, "level") && (
                <p className="text-sm text-red-500 mt-1">
                  {getFieldError(leagueErrors, "level")}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="league-gender">{t('leagueGender') || "Gender"}</Label>
              <Select
                value={leagueForm.gender}
                onValueChange={(value) =>
                  setLeagueForm({ ...leagueForm, gender: value as "male" | "female" | "mixed" })
                }
              >
                <SelectTrigger className={hasFieldError(leagueErrors, "gender") ? "border-red-500" : ""}>
                  <SelectValue placeholder={t('selectGender') || "Select gender"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{tTeams('masculine')}</SelectItem>
                  <SelectItem value="female">{tTeams('femenine')}</SelectItem>
                  <SelectItem value="mixed">{tTeams('mixed')}</SelectItem>
                </SelectContent>
              </Select>
              {getFieldError(leagueErrors, "gender") && (
                <p className="text-sm text-red-500 mt-1">
                  {getFieldError(leagueErrors, "gender")}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="league-start-date">{t('startDate')}</Label>
              <DatePicker
                value={
                  leagueForm.start_date
                    ? new Date(leagueForm.start_date)
                    : undefined
                }
                onChange={(date) =>
                  setLeagueForm((prev) => ({
                    ...prev,
                    start_date: date?.toISOString() || "",
                  }))
                }
                placeholder={t('selectStartDate')}
                className={
                  hasFieldError(leagueErrors, "start_date")
                    ? "border-red-500"
                    : ""
                }
              />
              {getFieldError(leagueErrors, "start_date") && (
                <p className="text-sm text-red-500 mt-1">
                  {getFieldError(leagueErrors, "start_date")}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="league-end-date">{t('endDate')}</Label>
              <DatePicker
                value={
                  leagueForm.end_date
                    ? new Date(leagueForm.end_date)
                    : undefined
                }
                onChange={(date) =>
                  setLeagueForm((prev) => ({
                    ...prev,
                    end_date: date?.toISOString() || "",
                  }))
                }
                placeholder={t('selectEndDate')}
                className={
                  hasFieldError(leagueErrors, "end_date")
                    ? "border-red-500"
                    : ""
                }
              />
              {getFieldError(leagueErrors, "end_date") && (
                <p className="text-sm text-red-500 mt-1">
                  {getFieldError(leagueErrors, "end_date")}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateLeague(false)}
            >
{tCommon('cancel')}
            </Button>
            <Button onClick={handleCreateLeague}>{t('createLeague')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit League Dialog */}
      <Dialog
        open={!!editingLeague}
        onOpenChange={() => setEditingLeague(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editLeague')}</DialogTitle>
            <DialogDescription>{t('updateLeagueDetails')}</DialogDescription>
            {/* Level and Gender are not editable - display as read-only badges */}
            {editingLeague && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <Badge variant={getLevelBadgeVariant(editingLeague.level)}>
                  {tCommon('level')} {editingLeague.level}
                </Badge>
                <Badge variant={getGenderBadgeVariant(editingLeague.gender)}>
                  {editingLeague.gender === 'male' ? tTeams('masculine') : editingLeague.gender === 'female' ? tTeams('femenine') : tTeams('mixed')}
                </Badge>
              </div>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-league-name">{t('leagueName')}</Label>
              <Input
                ref={editLeagueNameInputRef}
                id="edit-league-name"
                value={leagueForm.name}
                onChange={(e) =>
                  setLeagueForm({ ...leagueForm, name: e.target.value })
                }
                onFocus={(e) => {
                  // Move cursor to end instead of selecting all text
                  e.target.setSelectionRange(e.target.value.length, e.target.value.length);
                }}
                onMouseDown={(e) => {
                  // Prevent text selection on mouse down
                  if (e.detail > 1) {
                    e.preventDefault();
                  }
                }}
                className={
                  hasFieldError(leagueErrors, "name") ? "border-red-500" : ""
                }
                autoFocus={false}
              />
              {getFieldError(leagueErrors, "name") && (
                <p className="text-sm text-red-500 mt-1">
                  {getFieldError(leagueErrors, "name")}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-league-start-date">{t('startDate')}</Label>
              <DatePicker
                value={
                  leagueForm.start_date
                    ? new Date(leagueForm.start_date)
                    : undefined
                }
                onChange={(date) =>
                  setLeagueForm({
                    ...leagueForm,
                    start_date: date?.toISOString() || "",
                  })
                }
                placeholder={t('selectStartDate')}
                className={
                  hasFieldError(leagueErrors, "start_date")
                    ? "border-red-500"
                    : ""
                }
              />
              {getFieldError(leagueErrors, "start_date") && (
                <p className="text-sm text-red-500 mt-1">
                  {getFieldError(leagueErrors, "start_date")}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-league-end-date">{t('endDate')}</Label>
              <DatePicker
                value={
                  leagueForm.end_date
                    ? new Date(leagueForm.end_date)
                    : undefined
                }
                onChange={(date) =>
                  setLeagueForm({
                    ...leagueForm,
                    end_date: date?.toISOString() || "",
                  })
                }
                placeholder={t('selectEndDate')}
                className={
                  hasFieldError(leagueErrors, "end_date")
                    ? "border-red-500"
                    : ""
                }
              />
              {getFieldError(leagueErrors, "end_date") && (
                <p className="text-sm text-red-500 mt-1">
                  {getFieldError(leagueErrors, "end_date")}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLeague(null)}>
{tCommon('cancel')}
            </Button>
            <Button onClick={handleUpdateLeague}>{t('updateLeague')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Delete League Confirmation */}
      <AlertDialog
        open={!!deleteConfirmLeague}
        onOpenChange={(open) => !open && setDeleteConfirmLeague(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteLeague')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteLeagueConfirm', { name: deleteConfirmLeague?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmLeague(null)}>
              {tCommon('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLeague}
              className="bg-black text-white hover:bg-black/90"
            >
              {tCommon('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Team Search Modal */}
      <Dialog
        open={showAddTeamModal}
        onOpenChange={(open) => {
          setShowAddTeamModal(open);
          if (!open) {
            setSelectedLeagueForAdd(null);
            setSearchTerm("");
            setAvailableTeams([]);
          }
        }}
      >
        <DialogContent className="max-w-[min(42rem,calc(100%-2rem))] max-h-[80vh] overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle>
              {t('addTeam') || "Add Team"} - {selectedLeagueForAdd?.name}
            </DialogTitle>
            {selectedLeagueForAdd && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <Badge variant={getLevelBadgeVariant(selectedLeagueForAdd.level)}>
                  {tCommon('level')} {selectedLeagueForAdd.level}
                </Badge>
                <Badge variant={getGenderBadgeVariant(selectedLeagueForAdd.gender)}>
                  {selectedLeagueForAdd.gender === 'male' ? tTeams('masculine') : selectedLeagueForAdd.gender === 'female' ? tTeams('femenine') : tTeams('mixed')}
                </Badge>
              </div>
            )}
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={t('searchTeam') || "Search teams..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Available Teams List */}
            {availableTeams.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>{t('noAvailableTeams') || "No available teams matching this league's level and gender"}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {availableTeams
                  .filter((team: any) => {
                    const teamName = team.team?.name || team.name || '';
                    return teamName.toLowerCase().includes(searchTerm.toLowerCase());
                  })
                  .map((team: any) => {
                    const teamData = team.team || team;
                    const teamName = teamData.name || '';
                    const teamId = teamData.id || team.id;
                    const memberCount = team.members?.length || 0;
                    
                    return (
                      <Card key={teamId} className="hover:bg-accent transition-colors">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-semibold">{teamName}</p>
                            <p className="text-sm text-muted-foreground">
                              {t('members') || "Members"}: {memberCount}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAddTeam(teamId)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            {t('add') || "Add"}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Team Confirmation Dialog */}
      <AlertDialog open={showRemoveTeamConfirm} onOpenChange={(open) => {
        setShowRemoveTeamConfirm(open);
        if (!open) {
          setPendingRemoveTeam(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('removeTeam')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('removeTeamConfirm') || "Are you sure you want to remove this team from the league?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {tCommon('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveTeam}
              className="bg-black text-white hover:bg-black/90"
            >
              {tCommon('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Details Dialog */}
      <Dialog open={showPaymentDetailsDialog} onOpenChange={setShowPaymentDetailsDialog}>
        <DialogContent className="max-w-[min(42rem,calc(100%-2rem))] p-4">
          <DialogHeader>
            <DialogTitle>{tTeams('paymentDetails') || "Payment Details"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {paymentDetails && (
              <>
                <div>
                  <Label className="text-sm font-medium">{tTeams('amountPaid') || "Amount Paid"}</Label>
                  <p className="text-lg font-semibold mt-1">{paymentDetails.amount ?? 0}€</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{tTeams('paidDate') || "Paid Date"}</Label>
                  {paymentDetails.date ? (
                    <p className="text-base mt-1 flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      {new Date(paymentDetails.date).toLocaleDateString()}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">-</p>
                  )}
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPaymentDetailsDialog(false)}>
              {tCommon('close') || "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Members Modal */}
      <Dialog
        open={!!selectedTeamInfo}
        onOpenChange={(open) => {
          if (!open && selectedTeamInfo) {
            // Refresh teams for the league when modal closes
            const leagueId = selectedTeamInfo.leagueId;
            setSelectedTeamInfo(null);
            // Force refresh by clearing cache and reloading
            if (leagueId) {
              setLeagueTeamsMap(prev => {
                const updated = { ...prev };
                delete updated[leagueId];
                return updated;
              });
              setTeamsLoadingMap(prev => {
                const updated = { ...prev };
                delete updated[leagueId];
                return updated;
              });
              loadLeagueTeams(leagueId, true);
            }
          }
        }}
      >
        <DialogContent className="max-w-3xl min-h-[60vh] max-h-[90vh] overflow-y-auto p-4 [&_[data-slot=dialog-close]]:border [&_[data-slot=dialog-close]]:border-border [&_[data-slot=dialog-close]]:p-1.5 [&_[data-slot=dialog-close]]:bg-background">
          <DialogTitle className="sr-only">{tTeams('teamDetails')}</DialogTitle>
          {selectedTeamInfo && (
            <TeamDetail
              teamId={selectedTeamInfo.teamId}
              embedded={true}
              forceAdmin={true}
              onClose={() => {
                // Refresh teams for the league if needed
                if (selectedTeamInfo?.leagueId) {
                  const leagueId = selectedTeamInfo.leagueId;
                  setSelectedTeamInfo(null);
                  // Force refresh by clearing cache and reloading
                  setLeagueTeamsMap(prev => {
                    const updated = { ...prev };
                    delete updated[leagueId];
                    return updated;
                  });
                  setTeamsLoadingMap(prev => {
                    const updated = { ...prev };
                    delete updated[leagueId];
                    return updated;
                  });
                  loadLeagueTeams(leagueId, true);
                } else {
                  setSelectedTeamInfo(null);
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
