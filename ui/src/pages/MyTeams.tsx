import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Calendar, Trophy, LogIn, XIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, type Team } from "@/lib/serverComm";
import { getLevelBadgeVariant, getGenderBadgeVariant } from "@/lib/badge-utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useTranslation as useI18nTranslation } from 'react-i18next';
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
  member_count: number;
}

export function MyTeams() {
  const { canCreateTeams, refreshServerUser } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('teams');
  const { t: tCommon } = useTranslation('common');
  const { i18n } = useI18nTranslation('teams');
  const [teams, setTeams] = useState<TeamWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Join team modal state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookedUpTeam, setLookedUpTeam] = useState<{ name: string; level: string; gender: string } | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    loadTeams();
  }, []);

  // Cleanup: Close all modals if component unmounts during join operation
  useEffect(() => {
    return () => {
      // Force close modals on unmount to prevent overlay from blocking navigation
      setShowConfirmation(false);
      setShowJoinModal(false);
    };
  }, []);


  // Handle AlertDialog close - reset state when user closes without confirming
  const handleConfirmationDialogChange = (open: boolean) => {
    setShowConfirmation(open);
    if (!open && !joining) {
      // User closed the dialog without joining - reset state
      // Keep join modal open so user can try again
      setPasscode("");
      setLookedUpTeam(null);
      setLookupError(null);
    }
  };

  const loadTeams = async () => {
    try {
      setLoading(true);
      const response = await api.getMyTeams();
      if (response.error) {
        setError(response.error);
      } else {
        setTeams(response.teams);
      }
    } catch (err) {
      setError(tCommon('failedToLoadTeams'));
      console.error("Error loading teams:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Helper function to translate backend error messages
  const translateError = (errorMessage: string): string => {
    // Map backend English error messages to translation keys
    const errorMap: Record<string, string> = {
      "Team is full": "teamFull",
      "Admins cannot join teams": "adminsCannotJoin",
      "You are already a member of this team": "alreadyMember",
      "User not found": "userNotFound",
      "Player must have a gender set in their profile": "genderRequired",
      "Masculine teams can only contain male players": "masculineTeamOnly",
      "Feminine teams can only contain female players": "feminineTeamOnly",
      "Mixed teams must contain both masculine and feminine players": "mixedTeamRequirement",
      "Passcode is required": "passcodeRequired",
      "Invalid passcode": "invalidPasscode",
    };

    // Check for the dynamic "already on team" error message
    const alreadyOnTeamMatch = errorMessage.match(/Player is already on a Level (\d+) (masculine|feminine|mixed) team \((.+)\)/);
    if (alreadyOnTeamMatch) {
      const [, level, gender, teamName] = alreadyOnTeamMatch;
      const genderMap: Record<string, string> = {
        "masculine": t('masculine'),
        "feminine": t('femenine'),
        "mixed": t('mixed'),
      };
      return t('alreadyOnTeam', { level, gender: genderMap[gender] || gender, teamName });
    }

    // Try to find a translation key for the error
    if (errorMap[errorMessage]) {
      return t(errorMap[errorMessage]);
    }

    // If no translation found, return the original error message
    return errorMessage;
  };

  const handleLookupTeam = async () => {
    if (!passcode.trim()) {
      setLookupError(t('invalidPasscode'));
      return;
    }

    try {
      setLookingUp(true);
      setLookupError(null);
      const response = await api.lookupTeamByPasscode(passcode.trim().toUpperCase());
      
      if (response.error) {
        setLookupError(translateError(response.error));
      } else {
        setLookedUpTeam(response.team);
        // Keep join modal open and show confirmation modal on top
        setShowConfirmation(true);
      }
    } catch (err: any) {
      // This should rarely happen since lookupTeamByPasscode returns {error} instead of throwing
      console.error("Unexpected error looking up team:", err);
      setLookupError(err?.message || t('invalidPasscode'));
    } finally {
      setLookingUp(false);
    }
  };

  const handleConfirmJoin = async () => {
    if (!passcode.trim() || !lookedUpTeam) return;

    try {
      setJoining(true);
      const response = await api.joinTeam(passcode.trim().toUpperCase());
      
      if (response.error) {
        setLookupError(translateError(response.error));
        setJoining(false);
        // Close confirmation modal but keep join modal open
        setShowConfirmation(false);
        // Join modal is already open, just clear the error
      } else {
        // Success - close all modals first
        setShowConfirmation(false);
        setShowJoinModal(false);
        setJoining(false);
        
        // Wait for modals to close before resetting state and refreshing
        setTimeout(async () => {
          setPasscode("");
          setLookedUpTeam(null);
          setLookupError(null);
          
          // Refresh server user data to ensure permissions are updated
          try {
            await refreshServerUser();
            await loadTeams();
          } catch (refreshErr) {
            console.error("Error refreshing user data:", refreshErr);
            // Continue even if refresh fails
          }
        }, 250);
      }
    } catch (err: any) {
      // This should rarely happen since joinTeam returns {error} instead of throwing
      // But keep as fallback for unexpected errors
      console.error("Unexpected error joining team:", err);
      setLookupError(err?.message || t('invalidPasscode'));
      setJoining(false);
      setShowConfirmation(false);
      // Join modal should already be open or we'll reopen it
    }
  };

  const handleOpenJoinModal = () => {
    setShowJoinModal(true);
    setPasscode("");
    setLookupError(null);
    setLookedUpTeam(null);
  };

  const handleCloseJoinModal = (open?: boolean) => {
    // If called from Dialog's onOpenChange, open will be false when closing
    // If called manually (button click), open will be undefined
    // Only close if explicitly closing (open === false) or called without parameter
    if (open === false || open === undefined) {
      // If confirmation is open, don't reset state (user might just be closing join modal)
      // Otherwise, reset everything
      if (!showConfirmation) {
        setShowJoinModal(false);
        setPasscode("");
        setLookupError(null);
        setLookedUpTeam(null);
      } else {
        // Confirmation is open, just close the join modal without resetting lookedUpTeam
        setShowJoinModal(false);
      }
    }
    // If open === true, that means Dialog is trying to open, so don't do anything
  };

  const handleCancelJoinModal = () => {
    // Direct handler for cancel button - always close
    handleCloseJoinModal();
  };


  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>{t('loadingYourTeams')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={loadTeams}>{t('tryAgain')}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('myTeams')}</h1>
          <p className="text-muted-foreground">
            {t('manageTeams')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleOpenJoinModal} variant="outline">
            <LogIn className="w-4 h-4 mr-2" />
            {t('joinTeam')}
          </Button>
          {canCreateTeams && (
            <Button asChild>
              <Link to="/teams/create">
                <Plus className="w-4 h-4 mr-2" />
                {t('createTeam')}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {teams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('noTeamsYet')}</h3>
            <p className="text-muted-foreground text-center mb-4">
              {canCreateTeams 
                ? t('createFirstTeam')
                : t('needValidatedLevel')
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((teamData) => (
            <Card key={teamData.team.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">{teamData.team.name}</CardTitle>
                <CardDescription className="mt-1">
                  {teamData.league ? teamData.league.name : t('noLeague')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teamData.group ? (
                    <>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Trophy className="w-4 h-4" />
                        <span>{teamData.group.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={getLevelBadgeVariant(teamData.group.level)}>
                          Level {teamData.group.level}
                        </Badge>
                        <Badge variant={getGenderBadgeVariant(teamData.group.gender)}>
                          {teamData.group.gender === "male" ? t('masculine') : teamData.group.gender === "female" ? t('femenine') : t('mixed')}
                        </Badge>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge variant={getLevelBadgeVariant(teamData.team.level)}>
                        Level {teamData.team.level}
                      </Badge>
                      <Badge variant={getGenderBadgeVariant(teamData.team.gender)}>
                        {teamData.team.gender === "male" ? t('masculine') : teamData.team.gender === "female" ? t('femenine') : t('mixed')}
                      </Badge>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>
                      {teamData.member_count} {teamData.member_count === 1 ? tCommon('member') : tCommon('members')}
                    </span>
                  </div>
                  
                  {teamData.league && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {formatDate(teamData.league.start_date)} - {formatDate(teamData.league.end_date)}
                      </span>
                    </div>
                  )}
                  
                  <div className="pt-2">
                    <Button asChild variant="outline" className="w-full">
                      <Link to={`/teams/${teamData.team.id}`}>
                        {t('viewTeamDetails')}
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Join Team Modal */}
      <Dialog open={showJoinModal} onOpenChange={handleCloseJoinModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('joinTeamModalTitle')}</DialogTitle>
            <DialogDescription>
              {t('enterPasscode')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="text"
              placeholder={t('passcodePlaceholder')}
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value.toUpperCase());
                setLookupError(null);
              }}
              maxLength={6}
              className="text-center text-lg tracking-widest font-mono"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !lookingUp) {
                  handleLookupTeam();
                }
              }}
            />
            {lookupError && (
              <p className="text-sm text-destructive">{lookupError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelJoinModal}>
              {t('cancel')}
            </Button>
            <Button onClick={handleLookupTeam} disabled={lookingUp || !passcode.trim()}>
              {lookingUp ? t('lookingUp') : t('lookup')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={handleConfirmationDialogChange}>
        <AlertDialogContent>
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => handleConfirmationDialogChange(false)}
              disabled={joining}
              className="rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
              aria-label="Close"
            >
              <XIcon className="size-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('joinConfirmationTitle')}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              {lookedUpTeam && (
                <div className="space-y-3 mt-4">
                  <div>
                    {(() => {
                      const rawMessage = i18n.getResource(i18n.language, 'teams', 'joinConfirmationMessage');
                      const parts = rawMessage.split('{{teamName}}');
                      return (
                        <>
                          {parts[0]}
                          <strong>{lookedUpTeam.name}</strong>
                          {parts[1]}
                        </>
                      );
                    })()}
                  </div>
                  <div className="space-y-2 p-3 bg-muted rounded-md">
                    <div className="font-medium text-center">{t('teamDetails')}</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex gap-2 justify-center">
                        <Badge variant={getLevelBadgeVariant(lookedUpTeam.level)}>
                          {tCommon('level')} {lookedUpTeam.level}
                        </Badge>
                        <Badge variant={getGenderBadgeVariant(lookedUpTeam.gender)}>
                          {lookedUpTeam.gender === "male" ? t('masculine') : lookedUpTeam.gender === "female" ? t('femenine') : t('mixed')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={joining}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmJoin} disabled={joining}>
              {joining ? t('joining') : t('confirmJoin')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
