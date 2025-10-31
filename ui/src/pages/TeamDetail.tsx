import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
// DialogClose not needed; embedded header will be suppressed
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Edit, UserPlus, UserMinus, Calendar, Clock, AlertTriangle, Mars, Venus, Copy, Check } from "lucide-react";
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

interface TeamWithDetails {
  team: Team;
  league: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
  } | null;
  group: {
    id: string;
    name: string;
    level: string;
    gender: string;
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

  // Function to get the correct back navigation URL
  const getBackUrl = () => {
    if (isAdmin && team && team.league && team.group) {
      // If admin and we have team data with league/group, go back to admin teams page
      return `/admin/leagues/${team.league.id}/groups/${team.group.id}/teams`;
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
    
    try {
      const response = await api.removeTeamMember(id, userId);
      if (response.error) {
        setError(response.error);
      } else {
        // Reload team to get updated member list
        await loadTeam();
      }
    } catch (err) {
      setError(t('failedToRemoveMember'));
      console.error("Error removing member:", err);
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



  const isTeamCreator = team && serverUser && team.team.created_by === serverUser.id;
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
    <div className={embedded ? "max-w-4xl mx-auto" : "container mx-auto p-4 max-w-4xl"}>

      {error && (
        <div className="mb-6 p-4 border border-destructive/20 bg-destructive/10 rounded-md">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Team Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="space-y-4 pt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <div className="space-y-2">
                    <h4 className="font-medium text-center">{team.team.name}</h4>
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
                    <div className="flex items-center gap-2 mt-2">
                      {team.team.league_id && team.group ? (
                        <>
                          <span className="text-sm">{team.group.name}</span>
                          <Badge variant={getLevelBadgeVariant(team.group.level)}>
                            Level {team.group.level}
                          </Badge>
                          <Badge variant={getGenderBadgeVariant(team.group.gender)}>
                            {team.group.gender === "male" ? t('masculine') : team.group.gender === "female" ? t('femenine') : t('mixed')}
                          </Badge>
                        </>
                      ) : (
                        <>
                          <Badge variant={getLevelBadgeVariant(team.team.level)}>
                            Level {team.team.level}
                          </Badge>
                          <Badge variant={getGenderBadgeVariant(team.team.gender)}>
                            {team.team.gender === "male" ? t('masculine') : team.team.gender === "female" ? t('femenine') : t('mixed')}
                          </Badge>
                        </>
                      )}
                    </div>
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
                          Please add your team availability
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
            <CardHeader>
              <div className="flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-base sm:text-lg font-semibold">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                  {t('teamMembers')} ({team.members.length}/4)
                </h4>
                <div className="flex items-center gap-2">
                  {isTeamIncomplete && (
                    <button
                      type="button"
                      onClick={() => setShowWarnings((v) => !v)}
                      className={`p-2 rounded-full hover:bg-muted relative ${showWarnings ? 'ring-2 ring-yellow-500' : ''}`}
                      aria-label={showWarnings ? tCommon('hide') : tCommon('show')}
                      title={showWarnings ? tCommon('hide') : tCommon('show')}
                    >
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    </button>
                  )}
                  {(isTeamCreator || isAdmin) && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowPlayerSearchModal(true)}
                      disabled={team.members.length >= 4}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">{t('addPlayers')}</span>
                      <span className="sm:hidden">{tCommon('add')}</span>
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
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
                      <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
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
                                  imageUrl: user.profile_picture_url!,
                                  firstName: user.first_name,
                                  lastName: user.last_name,
                                  email: user.email,
                                });
                              } : undefined}
                            >
                              {user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}
                            </div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      <div className="flex items-center gap-2">
                        {(isTeamCreator || isAdmin) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (isAdmin) {
                                handleRemoveMember(user.id);
                              } else {
                                setPendingRemoveUserId(user.id);
                                const name = user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
                                setPendingRemoveUserName(name);
                                setConfirmRemoveOpen(true);
                              }
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

      {/* Player Search Modal */}
      {(isTeamCreator || isAdmin) && (
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

      {/* Confirm Remove Member (Players only) */}
      {!isAdmin && (
        <AlertDialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{tCommon('confirm')}</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingRemoveUserName ? `${pendingRemoveUserName}` : ''}
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
