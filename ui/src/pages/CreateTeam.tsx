import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, type League, type Group, type NewTeam } from "@/lib/serverComm";
import { useTranslation } from "@/hooks/useTranslation";

export function CreateTeam() {
  const { serverUser } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('teams');
  const { t: tCommon } = useTranslation('common');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [teamName, setTeamName] = useState("");
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  
  // Data state
  const [leagues, setLeagues] = useState<League[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadLeagues();
  }, []);

  useEffect(() => {
    if (selectedLeagueId) {
      loadGroups(selectedLeagueId);
    } else {
      setGroups([]);
      setSelectedGroupId("");
    }
  }, [selectedLeagueId]);

  const loadLeagues = async () => {
    try {
      setLoadingData(true);
      const response = await api.getLeagues();
      if (response.error) {
        setError(response.error);
      } else {
        setLeagues(response.leagues);
      }
    } catch (err) {
        setError(t('failedToLoadLeagues'));
      console.error("Error loading leagues:", err);
    } finally {
      setLoadingData(false);
    }
  };

  const loadGroups = async (leagueId: string) => {
    try {
      const response = await api.getGroups(leagueId);
      if (response.error) {
        setError(response.error);
      } else {
        setGroups(response.groups);
      }
    } catch (err) {
        setError(t('failedToLoadGroups'));
      console.error("Error loading groups:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamName.trim() || !selectedLeagueId || !selectedGroupId) {
      setError(t('pleaseFillAllFields'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const teamData: NewTeam = {
        name: teamName.trim(),
        league_id: selectedLeagueId,
        group_id: selectedGroupId,
      };

      const response = await api.createTeam(teamData);
      
      if (response.error) {
        setError(response.error);
      } else {
        // Redirect to team detail page
        navigate(`/teams/${response.team.id}`);
      }
    } catch (err) {
      setError(t('failedToCreateTeam'));
      console.error("Error creating team:", err);
    } finally {
      setLoading(false);
    }
  };


  if (loadingData) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>{t('loadingLeaguesGroups')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/teams")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">{t('backToTeams')}</span>
          <span className="sm:hidden">{tCommon('back')}</span>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('createTeam')}</h1>
          <p className="text-muted-foreground">
            {t('createNewTeam')}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
{t('teamInformation')}
          </CardTitle>
          <CardDescription>
            {serverUser?.claimed_level && (
              <span>
{t('yourValidatedLevel', { level: serverUser.claimed_level })}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 border border-destructive/20 bg-destructive/10 rounded-md">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="teamName">{t('teamName')}</Label>
              <Input
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder={t('teamNamePlaceholder')}
                required
                maxLength={100}
              />
              <p className="text-sm text-muted-foreground">
{t('teamNameUnique')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="league">{t('selectLeague')}</Label>
              <Select value={selectedLeagueId} onValueChange={setSelectedLeagueId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectLeague')} />
                </SelectTrigger>
                <SelectContent>
                  {leagues.map((league) => (
                    <SelectItem key={league.id} value={league.id}>
                      {league.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="group">{t('selectGroup')}</Label>
              <Select 
                value={selectedGroupId} 
                onValueChange={setSelectedGroupId}
                disabled={!selectedLeagueId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('selectGroup')} />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex items-center gap-2">
                        <span>{group.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({t('level')} {group.level}, {group.gender})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedLeagueId && groups.length === 0 && (
                <p className="text-sm text-muted-foreground">
{t('noGroupsAvailable')}
                </p>
              )}
            </div>

            {selectedGroupId && (() => {
              const selectedGroup = groups.find(g => g.id === selectedGroupId);
              if (!selectedGroup) return null;
              
              const levelMismatch = serverUser?.claimed_level !== selectedGroup.level;
              
              return levelMismatch && (
                <div className="p-3 border border-destructive/20 bg-destructive/10 rounded text-destructive text-sm">
                  ⚠️ {t('levelMismatch', { level: serverUser?.claimed_level, groupLevel: selectedGroup.level })}
                </div>
              );
            })()}

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading || !teamName.trim() || !selectedLeagueId || !selectedGroupId || (() => {
                  const selectedGroup = groups.find(g => g.id === selectedGroupId);
                  return selectedGroup && serverUser?.claimed_level !== selectedGroup.level;
                })()}
                className="flex-1"
              >
{loading ? t('creatingTeam') : t('createTeam')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/teams")}
                disabled={loading}
              >
{tCommon('cancel')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
