import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Calendar, Trophy, LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, type Team } from "@/lib/serverComm";
import { getLevelBadgeVariant, getGenderBadgeVariant } from "@/lib/badge-utils";
import { useTranslation } from "@/hooks/useTranslation";
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
  const { canCreateTeams } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('teams');
  const { t: tCommon } = useTranslation('common');
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
        setLookupError(response.error);
      } else {
        setLookedUpTeam(response.team);
        setShowJoinModal(false);
        setShowConfirmation(true);
      }
    } catch (err) {
      setLookupError(t('invalidPasscode'));
      console.error("Error looking up team:", err);
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
        setLookupError(response.error);
        setShowConfirmation(false);
        setShowJoinModal(true);
      } else {
        // Success - reload teams and close modals
        setShowConfirmation(false);
        setPasscode("");
        setLookedUpTeam(null);
        await loadTeams();
        // Optionally navigate to the team detail page
        if (response.team?.id) {
          navigate(`/teams/${response.team.id}`);
        }
      }
    } catch (err) {
      setLookupError(t('invalidPasscode'));
      setShowConfirmation(false);
      setShowJoinModal(true);
      console.error("Error joining team:", err);
    } finally {
      setJoining(false);
    }
  };

  const handleOpenJoinModal = () => {
    setShowJoinModal(true);
    setPasscode("");
    setLookupError(null);
    setLookedUpTeam(null);
  };

  const handleCloseJoinModal = () => {
    setShowJoinModal(false);
    setPasscode("");
    setLookupError(null);
    setLookedUpTeam(null);
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
            <Button variant="outline" onClick={handleCloseJoinModal}>
              {t('cancel')}
            </Button>
            <Button onClick={handleLookupTeam} disabled={lookingUp || !passcode.trim()}>
              {lookingUp ? t('lookingUp') : t('lookup')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('joinConfirmationTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {lookedUpTeam && (
                <div className="space-y-3 mt-4">
                  <p>{t('joinConfirmationMessage', { teamName: lookedUpTeam.name })}</p>
                  <div className="space-y-2 p-3 bg-muted rounded-md">
                    <p className="font-medium">{t('teamDetails')}</p>
                    <div className="space-y-1 text-sm">
                      <p><strong>{t('teamName')}:</strong> {lookedUpTeam.name}</p>
                      <div className="flex gap-2">
                        <Badge variant={getLevelBadgeVariant(lookedUpTeam.level)}>
                          Level {lookedUpTeam.level}
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
