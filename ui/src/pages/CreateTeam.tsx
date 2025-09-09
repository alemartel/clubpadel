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

export function CreateTeam() {
  const { serverUser } = useAuth();
  const navigate = useNavigate();
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
      setError("Failed to load leagues");
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
      setError("Failed to load groups");
      console.error("Error loading groups:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamName.trim() || !selectedLeagueId || !selectedGroupId) {
      setError("Please fill in all fields");
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
      setError("Failed to create team");
      console.error("Error creating team:", err);
    } finally {
      setLoading(false);
    }
  };

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case "1": return "default";
      case "2": return "secondary";
      case "3": return "destructive";
      case "4": return "outline";
      default: return "default";
    }
  };

  const getGenderBadgeVariant = (gender: string) => {
    switch (gender) {
      case "male": return "default";
      case "female": return "secondary";
      case "mixed": return "outline";
      default: return "default";
    }
  };

  if (loadingData) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading leagues and groups...</p>
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
          Back to Teams
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create Team</h1>
          <p className="text-muted-foreground">
            Create a new team to participate in league play
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Information
          </CardTitle>
          <CardDescription>
            {serverUser?.claimed_level && (
              <span>
                Your validated level: <strong>Level {serverUser.claimed_level}</strong>
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
              <Label htmlFor="teamName">Team Name</Label>
              <Input
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name"
                required
                maxLength={100}
              />
              <p className="text-sm text-muted-foreground">
                Team name must be unique within the selected league
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="league">League</Label>
              <Select value={selectedLeagueId} onValueChange={setSelectedLeagueId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a league" />
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
              <Label htmlFor="group">Group</Label>
              <Select 
                value={selectedGroupId} 
                onValueChange={setSelectedGroupId}
                disabled={!selectedLeagueId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      <div className="flex items-center gap-2">
                        <span>{group.name}</span>
                        <span className="text-xs text-muted-foreground">
                          (Level {group.level}, {group.gender})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedLeagueId && groups.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No groups available in this league
                </p>
              )}
            </div>

            {selectedGroupId && (() => {
              const selectedGroup = groups.find(g => g.id === selectedGroupId);
              if (!selectedGroup) return null;
              
              const levelMismatch = serverUser?.claimed_level !== selectedGroup.level;
              
              return levelMismatch && (
                <div className="p-3 border border-destructive/20 bg-destructive/10 rounded text-destructive text-sm">
                  ⚠️ Your validated level ({serverUser?.claimed_level}) doesn't match this group's level ({selectedGroup.level})
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
                {loading ? "Creating Team..." : "Create Team"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/teams")}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
