import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { api, type Team } from "@/lib/serverComm";
import { getLevelBadgeVariant, getGenderBadgeVariant } from "@/lib/badge-utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Calendar, Trophy, Eye, Trash2 } from "lucide-react";

interface TeamWithDetails {
  team: Team;
  league: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
  };
  group: {
    id: string;
    name: string;
    level: string;
    gender: string;
  };
  creator: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    display_name?: string;
  };
  member_count: number;
}

export function AdminTeams() {
  const { isAdmin, loading } = useAuth();
  const { leagueId, groupId } = useParams<{ leagueId: string; groupId: string }>();
  const navigate = useNavigate();

  // State for teams
  const [teams, setTeams] = useState<TeamWithDetails[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsError, setTeamsError] = useState("");
  const [groupName, setGroupName] = useState("");
  const [leagueName, setLeagueName] = useState("");

  // State for delete confirmation
  const [deleteConfirmTeam, setDeleteConfirmTeam] = useState<TeamWithDetails | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate("/", { state: { error: "Admin access required" } });
    }
  }, [isAdmin, loading, navigate]);

  // Load teams and group info on mount
  useEffect(() => {
    if (isAdmin && groupId) {
      loadTeams();
      loadGroupInfo();
    }
  }, [isAdmin, groupId]);

  const loadTeams = async () => {
    if (!groupId) return;
    
    setTeamsLoading(true);
    setTeamsError("");
    try {
      // Get all teams in this group using admin endpoint
      const response = await api.getAdminTeamsByGroup(groupId);
      if (response.teams) {
        setTeams(response.teams);
      }
    } catch (error) {
      console.error("Failed to load teams:", error);
      setTeamsError("Failed to load teams");
    } finally {
      setTeamsLoading(false);
    }
  };

  const loadGroupInfo = async () => {
    if (!groupId) return;
    
    try {
      // Get leagues to find the group info
      const leaguesResponse = await api.getLeagues();
      for (const league of leaguesResponse.leagues) {
        const groupsResponse = await api.getGroups(league.id);
        const group = groupsResponse.groups.find((g: any) => g.id === groupId);
        if (group) {
          setGroupName(group.name);
          setLeagueName(league.name);
          break;
        }
      }
    } catch (error) {
      console.error("Failed to load group info:", error);
    }
  };

  const handleDeleteTeam = async () => {
    if (!deleteConfirmTeam) return;

    try {
      await api.deleteTeam(deleteConfirmTeam.team.id);
      setDeleteConfirmTeam(null);
      loadTeams();
    } catch (error) {
      console.error("Failed to delete team:", error);
    }
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/leagues/${leagueId}/groups`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Back to Groups</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold">
              <span className="hidden sm:inline">Teams - {groupName}</span>
              <span className="sm:hidden">Teams</span>
            </h1>
            <p className="text-muted-foreground">
              <span className="hidden sm:inline">{leagueName} • Level {teams[0]?.group.level} • {teams[0]?.group.gender}</span>
              <span className="sm:hidden">{groupName}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Group Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Group Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <h4 className="font-medium mb-2">Group Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{groupName}</span>
                  {teams.length > 0 && (
                    <>
                      <Badge variant={getLevelBadgeVariant(teams[0]?.group.level)}>
                        Level {teams[0]?.group.level}
                      </Badge>
                      <Badge variant={getGenderBadgeVariant(teams[0]?.group.gender)}>
                        {teams[0]?.group.gender}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">League Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{leagueName}</span>
                </div>
                {teams.length > 0 && (
                  <div className="text-muted-foreground">
                    {formatDate(teams[0]?.league.start_date)} - {formatDate(teams[0]?.league.end_date)}
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Statistics</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  <span>{teams.length} team{teams.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>
                    {teams.reduce((total, team) => total + parseInt(team.member_count.toString()), 0)} total members
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teams Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="w-5 h-5 mr-2" />
            Teams
          </CardTitle>
          <CardDescription>All teams in this group</CardDescription>
        </CardHeader>
        <CardContent>
          {teamsLoading ? (
            <div className="text-center py-4">Loading teams...</div>
          ) : teamsError ? (
            <div className="text-center text-red-500 py-4">{teamsError}</div>
          ) : teams.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No teams created yet</p>
              <p className="text-sm">Teams will appear here when players create them</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {teams.map((teamData) => (
                <Card key={teamData.team.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-xl">{teamData.team.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>Created by {teamData.creator.display_name || 
                          `${teamData.creator.first_name || ''} ${teamData.creator.last_name || ''}`.trim() || 
                          teamData.creator.email}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{teamData.member_count} member{teamData.member_count !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2 pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/teams/${teamData.team.id}`)}
                      className="flex-1 min-h-[44px]"
                    >
                      <Eye className="w-4 h-4 mr-1 hidden sm:block" />
                      <span className="sm:hidden">View</span>
                      <span className="hidden sm:inline">View</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteConfirmTeam(teamData)}
                      className="min-h-[44px] min-w-[44px]"
                      disabled
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Team Confirmation */}
      <Dialog
        open={!!deleteConfirmTeam}
        onOpenChange={() => setDeleteConfirmTeam(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Team</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirmTeam?.team.name}"? This
              action cannot be undone and will remove all team members.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmTeam(null)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTeam}>
              Delete Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
