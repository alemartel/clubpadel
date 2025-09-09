import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { api, type Team } from "@/lib/serverComm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface TeamWithDetails extends Team {
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
  member_count: number;
}

export function AdminTeams() {
  const { isAdmin, loading } = useAuth();
  const { groupId } = useParams<{ groupId: string }>();
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
      // Get all teams and filter by group
      const response = await api.getMyTeams();
      if (response.teams) {
        // Filter teams that belong to this group
        const groupTeams = response.teams.filter((teamData: any) => 
          teamData.group.id === groupId
        );
        setTeams(groupTeams);
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
      await api.deleteTeam(deleteConfirmTeam.id);
      setDeleteConfirmTeam(null);
      loadTeams();
    } catch (error) {
      console.error("Failed to delete team:", error);
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/leagues")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Leagues
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Teams - {groupName}</h1>
          <p className="text-muted-foreground">
            {leagueName} • Level {teams[0]?.group.level} • {teams[0]?.group.gender}
          </p>
        </div>
      </div>

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Name</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((teamData) => (
                  <TableRow key={teamData.team.id}>
                    <TableCell className="font-medium">
                      {teamData.team.name}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">
                          {teamData.team.created_by}
                        </div>
                        <div className="text-muted-foreground">
                          Team Creator
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{teamData.member_count}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDate(teamData.team.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/teams/${teamData.team.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirmTeam(teamData)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Group Information */}
      {teams.length > 0 && (
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
                    <span className="font-medium">{teams[0]?.group.name}</span>
                    <Badge variant={getLevelBadgeVariant(teams[0]?.group.level)}>
                      Level {teams[0]?.group.level}
                    </Badge>
                    <Badge variant={getGenderBadgeVariant(teams[0]?.group.gender)}>
                      {teams[0]?.group.gender}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">League Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{teams[0]?.league.name}</span>
                  </div>
                  <div className="text-muted-foreground">
                    {formatDate(teams[0]?.league.start_date)} - {formatDate(teams[0]?.league.end_date)}
                  </div>
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
                      {teams.reduce((total, team) => total + team.member_count, 0)} total members
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
