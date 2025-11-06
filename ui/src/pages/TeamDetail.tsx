import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
// DialogClose not needed; embedded header will be suppressed
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Edit, UserPlus, UserMinus, Calendar, Clock, AlertTriangle, Mars, Venus, Copy, Check, Trash2, Save, X } from "lucide-react";
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
import { useAuth } from "@/lib/auth-context";
import { api, type Team, type TeamMember } from "@/lib/serverComm";
import { getLevelBadgeVariant, getGenderBadgeVariant } from "@/lib/badge-utils";
import { PlayerSearchModal } from "../components/PlayerSearchModal";
import { TeamAvailabilityModal } from "../components/TeamAvailabilityModal";
import { ProfilePictureModal } from "../components/ProfilePictureModal";
import { UserAvatar } from "@/components/user-avatar";
import { useTranslation } from "@/hooks/useTranslation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface TeamWithDetails {
  team: Team;
  league: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
  } | null;
  members: Array<{
    member: TeamMember;
    user: {
      id: string;
      email: string;
      first_name?: string;
      last_name?: string;
      display_name?: string;
      gender?: string;
      profile_picture_url?: string;
    };
  }>;
}

export function TeamDetail({ embedded, teamId: propTeamId, forceAdmin, onClose }: {
  embedded?: boolean;
  teamId?: string;
  forceAdmin?: boolean;
  onClose?: () => void;
}) {
  const params = useParams<{ id: string }>();
  const id = propTeamId ?? params.id;
  const navigate = useNavigate();
  const { serverUser, isAdmin: contextIsAdmin } = useAuth();
  const isAdmin = !!forceAdmin || contextIsAdmin;
  const { t } = useTranslation('teams');
  const { t: tCommon } = useTranslation('common');
  const [team, setTeam] = useState<TeamWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPlayerSearchModal, setShowPlayerSearchModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [teamAvailability, setTeamAvailability] = useState<any[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [showAvailabilityWarnings, setShowAvailabilityWarnings] = useState(false);
  const [showWarnings, setShowWarnings] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [pendingRemoveUserId, setPendingRemoveUserId] = useState<string | null>(null);
  const [pendingRemoveUserName, setPendingRemoveUserName] = useState<string | null>(null);
  const [passcodeCopied, setPasscodeCopied] = useState(false);
  const [selectedUserForPicture, setSelectedUserForPicture] = useState<{
    imageUrl: string;
    firstName?: string;
    lastName?: string;
    email: string;
  } | null>(null);
  const [isEditingTeamName, setIsEditingTeamName] = useState(false);
  const [editedTeamName, setEditedTeamName] = useState("");
  const [isSavingTeamName, setIsSavingTeamName] = useState(false);
  const [isEditingTeamLevel, setIsEditingTeamLevel] = useState(false);
  const [editedTeamLevel, setEditedTeamLevel] = useState("");
  const [isSavingTeamLevel, setIsSavingTeamLevel] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);

  // Function to get the correct back navigation URL
  const getBackUrl = () => {
    if (isAdmin) {
      // If admin, go back to admin teams page
      return "/admin/teams";
    }
    // Otherwise, go to user's teams page
    return "/teams";
  };

  const loadTeam = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await api.getTeam(id);
      if (response.error) {
        setError(response.error);
      } else {
        setTeam(response.team);
      }
    } catch (err) {
      setError(t('failedToLoadTeamDetails'));
      console.error("Error loading team:", err);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    if (id) {
      // Reset state when id changes
      setError(null);
      setTeam(null);
      setLoading(true);
      loadTeam();
    }
  }, [id, loadTeam]);

  useEffect(() => {
    if (team) {
      loadTeamAvailability();
    }
  }, [team]);

  const loadTeamAvailability = async () => {
    if (!team) return;
    
    setAvailabilityLoading(true);
    try {
      const response = await api.getTeamAvailability(team.team.id);
      setTeamAvailability(response.availability || []);
    } catch (err: any) {
      console.error('Failed to load team availability:', err);
      // Don't set error state for availability since it's not critical
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!id) return;
    
    // Check if user is removing themselves
    const isRemovingSelf = serverUser?.id === userId;
    
    // Get the name of the member being removed for the toast message
    const memberToRemove = team?.members.find(m => m.member.user_id === userId);
    const memberName = memberToRemove?.user.display_name || 
      `${memberToRemove?.user.first_name || ''} ${memberToRemove?.user.last_name || ''}`.trim() || 
      memberToRemove?.user.email || '';
    
    try {
      const response = await api.removeTeamMember(id, userId);
      if (response.error) {
        setError(response.error);
      } else {
        // Show success toast
        toast.success(memberName ? t('memberRemoved', { name: memberName }) : t('memberRemoved', { name: '' }));
        
        // If user removed themselves, redirect to My Teams page
        if (isRemovingSelf) {
          navigate('/teams');
        } else {
          // Reload team to get updated member list
          await loadTeam();
        }
      }
    } catch (err) {
      setError(t('failedToRemoveMember'));
      console.error("Error removing member:", err);
    }
  };

  // Team name editing handlers (admin only)
  const handleEditTeamName = () => {
    if (!team || !isAdmin) return;
    setEditedTeamName(team.team.name);
    setIsEditingTeamName(true);
  };

  const handleCancelEditTeamName = () => {
    setIsEditingTeamName(false);
    setEditedTeamName("");
  };

  const handleSaveTeamName = async () => {
    if (!id || !team || !isAdmin) return;
    
    const trimmedName = editedTeamName.trim();
    if (!trimmedName) {
      setError(tCommon('name') + " " + tCommon('required'));
      return;
    }

    if (trimmedName === team.team.name) {
      // No change, just cancel
      handleCancelEditTeamName();
      return;
    }

    try {
      setIsSavingTeamName(true);
      setError(null);
      const response = await api.updateTeam(id, { name: trimmedName });
      
      if (response.error) {
        setError(response.error);
      } else {
        setIsEditingTeamName(false);
        setEditedTeamName("");
        await loadTeam(); // Reload to get updated team data
      }
    } catch (err: any) {
      setError(err.message || t('failedToUpdateTeamName') || 'Failed to update team name');
      console.error("Error updating team name:", err);
    } finally {
      setIsSavingTeamName(false);
    }
  };

  // Team level editing handlers (admin only)
  const handleEditTeamLevel = () => {
    if (!team || !isAdmin) return;
    setEditedTeamLevel(team.team.level);
    setIsEditingTeamLevel(true);
  };

  const handleCancelEditTeamLevel = () => {
    setIsEditingTeamLevel(false);
    setEditedTeamLevel("");
  };

  const handleSaveTeamLevel = async () => {
    if (!id || !team || !isAdmin) return;
    
    if (!editedTeamLevel) {
      setError(t('selectLevel') + " " + tCommon('required'));
      return;
    }

    if (editedTeamLevel === team.team.level) {
      // No change, just cancel
      handleCancelEditTeamLevel();
      return;
    }

    try {
      setIsSavingTeamLevel(true);
      setError(null);
      const response = await api.updateTeam(id, { level: editedTeamLevel });
      
      if (response.error) {
        setError(response.error);
      } else {
        setIsEditingTeamLevel(false);
        setEditedTeamLevel("");
        await loadTeam(); // Reload to get updated team data
        toast.success(t('teamLevelUpdated') || 'Team level updated');
      }
    } catch (err: any) {
      setError(err.message || t('failedToUpdateTeamName') || 'Failed to update team level');
      console.error("Error updating team level:", err);
    } finally {
      setIsSavingTeamLevel(false);
    }
  };

  // Delete team handler (admin only)
  const handleDeleteTeam = async () => {
    if (!id || !isAdmin) return;
    
    try {
      setIsDeletingTeam(true);
      setError(null);
      const response = await api.deleteTeam(id);
      
      if (response.error) {
        setError(response.error);
        setShowDeleteConfirm(false);
      } else {
        // Successfully deleted
        toast.success(t('teamDeleted'));
        if (embedded && onClose) {
          onClose();
        } else {
          navigate(getBackUrl());
        }
      }
    } catch (err: any) {
      setError(err.message || t('failedToDeleteTeam') || 'Failed to delete team');
      console.error("Error deleting team:", err);
    } finally {
      setIsDeletingTeam(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (time: string | null) => {
    if (!time) return '';
    return time.substring(0, 5); // Convert HH:MM:SS to HH:MM
  };

  const getDayName = (dayKey: string) => {
    const days: { [key: string]: string } = {
      'monday': t('monday'),
      'tuesday': t('tuesday'), 
      'wednesday': t('wednesday'),
      'thursday': t('thursday'),
      'friday': t('friday'),
      'saturday': t('saturday'),
      'sunday': t('sunday')
    };
    return days[dayKey] || dayKey;
  };



  const isTeamMember = team && serverUser && team.members.some(member => member.user.id === serverUser.id);

  // Check if team is incomplete
  const isTeamIncomplete = team && (
    team.members.length < 2 || // Minimum 2 players required
    (team.team.gender === "mixed" && (
      team.members.filter(m => m.user?.gender === "male").length === 0 ||
      team.members.filter(m => m.user?.gender === "female").length === 0
    ))
  );

  // Get incomplete team message
  const getIncompleteTeamMessage = () => {
    if (!team) return "";
    
    if (team.members.length < 2) {
      return t('teamIncompleteMinPlayers');
    }
    
    if (team.team.gender === "mixed") {
      const maleCount = team.members.filter(m => m.user?.gender === "male").length;
      const femaleCount = team.members.filter(m => m.user?.gender === "female").length;
      
      if (maleCount === 0 && femaleCount === 0) {
        return t('teamIncompleteMixedMissingBoth');
      } else if (maleCount === 0) {
        return t('teamIncompleteMixedMissingMale');
      } else if (femaleCount === 0) {
        return t('teamIncompleteMixedMissingFemale');
      }
    }
    
    return "";
  };

  // Validate availability requirements
  const validateAvailability = () => {
    if (!teamAvailability || teamAvailability.length === 0) {
      return { meetsRequirements: false };
    }

    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const weekends = ['saturday', 'sunday'];
    
    // Count available weekdays
    const availableWeekdays = teamAvailability.filter(day => 
      weekdays.includes(day.day_of_week) && day.is_available
    );
    
    // Check if we have minimum 3 weekdays
    const hasMinimumWeekdays = availableWeekdays.length >= 3;
    
    // Check if any weekday plays until 9:00 PM or later (21:00)
    const hasLateWeekday = availableWeekdays.some(day => {
      if (!day.end_time) return false;
      const endTime = day.end_time.toString();
      const timeStr = endTime.includes(':') ? endTime : `${endTime}:00`;
      const [hours] = timeStr.split(':').map(Number);
      return hours >= 21; // 9:00 PM = 21:00
    });
    
    // Check if any weekend day is available from 9:00 AM to 12:00 PM
    const availableWeekends = teamAvailability.filter(day => 
      weekends.includes(day.day_of_week) && day.is_available
    );
    
    const hasValidWeekend = availableWeekends.some(day => {
      if (!day.start_time || !day.end_time) return false;
      const startTime = day.start_time.toString();
      const endTime = day.end_time.toString();
      const startTimeStr = startTime.includes(':') ? startTime : `${startTime}:00`;
      const endTimeStr = endTime.includes(':') ? endTime : `${endTime}:00`;
      const [startHours] = startTimeStr.split(':').map(Number);
      const [endHours] = endTimeStr.split(':').map(Number);
      // Weekend day from 9:00 AM (9) to at least 12:00 PM (12)
      return startHours <= 9 && endHours >= 12;
    });
    
    // Requirements: 3+ weekdays AND (late weekday OR valid weekend)
    const meetsRequirements = hasMinimumWeekdays && (hasLateWeekday || hasValidWeekend);
    
    return {
      meetsRequirements,
      hasMinimumWeekdays,
      hasLateWeekday,
      hasValidWeekend,
    };
  };
  
  const availabilityValidation = validateAvailability();

  if (loading) {
    return embedded ? (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>{t('loadingTeamDetails')}</p>
        </div>
      </div>
    ) : (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>{t('loadingTeamDetails')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return embedded ? (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || t('teamNotFound')}</p>
          {onClose && (
            <Button onClick={onClose} variant="outline">{tCommon('back')}</Button>
          )}
        </div>
      </div>
    ) : (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-destructive mb-4">{error || t('teamNotFound')}</p>
            <Button onClick={() => navigate(getBackUrl())}>
              {tCommon('back')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "" : "container mx-auto p-4 max-w-4xl"}>

      {error && (
        <div className="mb-6 p-4 border border-destructive/20 bg-destructive/10 rounded-md">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      <div className={embedded ? "space-y-4" : "grid gap-4 lg:grid-cols-3"}>
        {/* Team Information */}
        <div className={embedded ? "space-y-4" : "lg:col-span-2 space-y-4"}>
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-start gap-2">
                      {isEditingTeamName && isAdmin ? (
                        <div className="flex items-center gap-2 flex-1 max-w-md">
                          <Input
                            value={editedTeamName}
                            onChange={(e) => setEditedTeamName(e.target.value)}
                            className="flex-1"
                            autoFocus
                            disabled={isSavingTeamName}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSaveTeamName}
                            disabled={isSavingTeamName || !editedTeamName.trim()}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelEditTeamName}
                            disabled={isSavingTeamName}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <h4 className="font-medium text-left">{team.team.name}</h4>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleEditTeamName}
                              className="h-6 w-6 p-0"
                              title={tCommon('edit')}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                          {isAdmin && !embedded && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowDeleteConfirm(true)}
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              title={t('deleteTeam')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
  {t('createdOn', { date: formatDate(team.team.created_at) })}
                    </div>
                    {team.team.passcode && (
                      <div className="mt-3 flex items-center gap-2">
                        <h5 className="text-sm font-medium">{t('teamPasscode')}</h5>
                        <span className="text-sm font-mono tracking-widest">
                          {team.team.passcode}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(team.team.passcode || '');
                            setPasscodeCopied(true);
                            setTimeout(() => setPasscodeCopied(false), 2000);
                          }}
                          className="p-1 h-6 w-6"
                          title={passcodeCopied ? "Copied!" : "Copy passcode"}
                        >
                          {passcodeCopied ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      {isEditingTeamLevel && isAdmin ? (
                        <div className="flex items-center gap-2">
                          <Select
                            value={editedTeamLevel}
                            onValueChange={setEditedTeamLevel}
                            disabled={isSavingTeamLevel}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2">2</SelectItem>
                              <SelectItem value="3">3</SelectItem>
                              <SelectItem value="4">4</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSaveTeamLevel}
                            disabled={isSavingTeamLevel || !editedTeamLevel}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelEditTeamLevel}
                            disabled={isSavingTeamLevel}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Badge variant={getLevelBadgeVariant(team.team.level)}>
                            Level {team.team.level}
                          </Badge>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleEditTeamLevel}
                              className="h-6 w-6 p-0"
                              title={tCommon('edit')}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      )}
                      <Badge variant={getGenderBadgeVariant(team.team.gender)}>
                        {team.team.gender === "male" ? t('masculine') : team.team.gender === "female" ? t('femenine') : t('mixed')}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
{t('leagueDetails')}
                  </h4>
                  <div className="space-y-2 text-sm">
                    {team.league ? (
                      <>
                        <div className="font-medium">{team.league.name}</div>
                        <div className="text-muted-foreground">
                          {formatDate(team.league.start_date)} - {formatDate(team.league.end_date)}
                        </div>
                      </>
                    ) : (
                      <div className="font-medium text-muted-foreground">{t('noLeague')}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Team Availability */}
              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {t('teamAvailability')}
                  </h4>
                  {!availabilityValidation.meetsRequirements && teamAvailability.length > 0 && !availabilityLoading && (
                    <button
                      type="button"
                      onClick={() => setShowAvailabilityWarnings(v => !v)}
                      className={`p-2 rounded-full hover:bg-muted relative ${showAvailabilityWarnings ? 'ring-2 ring-yellow-500' : ''}`}
                      aria-label={showAvailabilityWarnings ? tCommon('hide') : tCommon('show')}
                      title={showAvailabilityWarnings ? tCommon('hide') : tCommon('show')}
                    >
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    </button>
                  )}
                </div>
                {!availabilityValidation.meetsRequirements && teamAvailability.length > 0 && !availabilityLoading && showAvailabilityWarnings && (
                  <div className="mb-4 p-3 border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10 rounded-md">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-1">
                          {t('availabilityWarningTitle')}
                        </p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 whitespace-pre-line">
                          {t('availabilityWarningDescription')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {availabilityLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
{t('loadingAvailability')}
                  </div>
                ) : teamAvailability.length > 0 ? (
                  <div className="space-y-2">
                    {teamAvailability
                      .filter(day => day.is_available)
                      .sort((a, b) => {
                        const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                        return dayOrder.indexOf(a.day_of_week) - dayOrder.indexOf(b.day_of_week);
                      })
                      .map((day) => (
                        <div key={day.day_of_week} className="flex items-center justify-between text-sm">
                          <span className="font-medium">{getDayName(day.day_of_week)}</span>
                          <span className="text-muted-foreground">
                            {formatTime(day.start_time)} - {formatTime(day.end_time)}
                          </span>
                        </div>
                      ))}
                    {teamAvailability.filter(day => day.is_available).length === 0 && (
                      <div className="text-sm text-muted-foreground">
{t('noAvailabilitySet')}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10 rounded-md">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          {t('pleaseAddTeamAvailability')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {(isTeamMember || isAdmin) && (
                  <div className="mt-4 flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setShowAvailabilityModal(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      {t('editAvailability')}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {t('teamMembers')} ({team.members.length}/4)
                </h4>
                <div className="flex items-center gap-2">
                  {isTeamIncomplete && (
                    <button
                      type="button"
                      onClick={() => setShowWarnings((v) => !v)}
                      className={`p-1 rounded-md hover:bg-yellow-100 dark:hover:bg-yellow-900/30 border border-border relative ${showWarnings ? 'ring-2 ring-yellow-500' : ''}`}
                      aria-label={showWarnings ? tCommon('hide') : tCommon('show')}
                      title={showWarnings ? tCommon('hide') : tCommon('show')}
                    >
                      <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    </button>
                  )}
                  {isAdmin && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowPlayerSearchModal(true)}
                      disabled={team.members.length >= 4}
                      className="h-8 w-8 p-0"
                    >
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {isTeamIncomplete && showWarnings && (
                <div className="mb-4 p-3 border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      {getIncompleteTeamMessage()}
                    </p>
                  </div>
                </div>
              )}
              {team.members.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{t('noTeamMembersYet')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {team.members.map(({ member, user }) => {
                    // Handle case where user might be null (data integrity issue)
                    if (!user || !user.id) {
                      return (
                        <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg border-destructive/50">
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
                                Unknown user ({member.user_id.substring(0, 8)}...)
                              </div>
                              <div className="text-sm text-muted-foreground">{tCommon('userNotFound') || 'User not found'}</div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div key={member.id} className="flex items-center justify-between p-2 sm:p-3 border rounded-lg">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
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
                                  imageUrl: user.profile_picture_url!,
                                  firstName: user.first_name,
                                  lastName: user.last_name,
                                  email: user.email,
                                });
                              } : undefined}
                            />
                            {user.gender && (
                              <div className="flex-shrink-0">
                                {user.gender === "male" ? (
                                  <Mars className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                                ) : user.gender === "female" ? (
                                  <Venus className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600 dark:text-pink-400" />
                                ) : null}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div 
                              className={user.profile_picture_url ? "font-medium cursor-pointer hover:underline truncate text-sm sm:text-base" : "font-medium truncate text-sm sm:text-base"}
                              onClick={user.profile_picture_url ? () => {
                                setSelectedUserForPicture({
                                  imageUrl: user.profile_picture_url!,
                                  firstName: user.first_name,
                                  lastName: user.last_name,
                                  email: user.email,
                                });
                              } : undefined}
                            >
                              {user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground truncate max-w-[120px] sm:max-w-none">{user.email}</div>
                          </div>
                        </div>
                      <div className="flex items-center gap-2">
                        {(isTeamMember || isAdmin) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPendingRemoveUserId(user.id);
                              const name = user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
                              setPendingRemoveUserName(name);
                              setConfirmRemoveOpen(true);
                            }}
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Delete Team Button (shown at bottom when embedded) */}
      {isAdmin && embedded && (
        <div className="pt-6 border-t">
          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {t('deleteTeam')}
          </Button>
        </div>
      )}

      {/* Player Search Modal */}
      {isAdmin && (
        <PlayerSearchModal
          open={showPlayerSearchModal}
          onOpenChange={setShowPlayerSearchModal}
          teamId={team.team.id}
          leagueId={team.team.league_id || null}
          level={team.team.level}
          gender={team.team.gender}
          onMemberAdded={loadTeam}
        />
      )}

      {/* Team Availability Modal */}
      {(isTeamMember || isAdmin) && (
        <TeamAvailabilityModal
          open={showAvailabilityModal}
          onOpenChange={setShowAvailabilityModal}
          teamId={team.team.id}
          onSuccess={() => {
            loadTeamAvailability();
          }}
        />
      )}

      {/* Confirm Remove Member */}
      <AlertDialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('removeMember')}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRemoveUserName ? t('removeMemberConfirm', { name: pendingRemoveUserName }) : t('removeMemberConfirm', { name: '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingRemoveUserId) {
                  handleRemoveMember(pendingRemoveUserId);
                }
                setConfirmRemoveOpen(false);
                setPendingRemoveUserId(null);
                setPendingRemoveUserName(null);
              }}
            >
              {tCommon('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Team Confirmation (Admin only) */}
      {isAdmin && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('deleteTeam')}</AlertDialogTitle>
              <AlertDialogDescription>
                {team?.team.name ? t('deleteTeamConfirmation', { teamName: team.team.name }) : t('deleteTeamConfirmation')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingTeam}>{tCommon('cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteTeam}
                disabled={isDeletingTeam}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeletingTeam ? tCommon('deleting') : tCommon('delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Profile Picture Modal */}
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
