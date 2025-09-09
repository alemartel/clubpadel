import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Edit, Trash2, UserPlus, UserMinus, Calendar, Trophy } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, type Team, type TeamMember } from "@/lib/serverComm";
import { FreePlayerMarketModal } from "../components/FreePlayerMarketModal";

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
  members: Array<{
    member: TeamMember;
    user: {
      id: string;
      email: string;
      first_name?: string;
      last_name?: string;
      display_name?: string;
    };
  }>;
}

export function TeamDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { serverUser } = useAuth();
  const [team, setTeam] = useState<TeamWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPlayerMarketModal, setShowPlayerMarketModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadTeam();
    }
  }, [id]);

  const loadTeam = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const response = await api.getTeam(id);
      if (response.error) {
        setError(response.error);
      } else {
        setTeam(response.team);
      }
    } catch (err) {
      setError("Failed to load team details");
      console.error("Error loading team:", err);
    } finally {
      setLoading(false);
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
      setError("Failed to remove team member");
      console.error("Error removing member:", err);
    }
  };

  const handleDeleteTeam = async () => {
    if (!id || !team) return;
    
    if (!confirm(`Are you sure you want to delete the team "${team.team.name}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await api.deleteTeam(id);
      if (response.error) {
        setError(response.error);
      } else {
        navigate("/teams");
      }
    } catch (err) {
      setError("Failed to delete team");
      console.error("Error deleting team:", err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "captain": return "default";
      case "member": return "secondary";
      default: return "outline";
    }
  };

  const isTeamCreator = team && serverUser && team.team.created_by === serverUser.id;

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading team details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-destructive mb-4">{error || "Team not found"}</p>
            <Button onClick={() => navigate("/teams")}>
              Back to Teams
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/teams")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Teams
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{team.team.name}</h1>
          <p className="text-muted-foreground">
            {team.league.name} • {team.group.name}
          </p>
        </div>
        {isTeamCreator && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Edit Team
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteTeam}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Team
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 border border-destructive/20 bg-destructive/10 rounded-md">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Team Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Team Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <h4 className="font-medium mb-2">Team Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4" />
                      <span className="font-medium">{team.team.name}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Created {formatDate(team.team.created_at)}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">League Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{team.league.name}</span>
                    </div>
                    <div className="text-muted-foreground">
                      {formatDate(team.league.start_date)} - {formatDate(team.league.end_date)}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Group Details</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{team.group.name}</span>
                      <Badge variant={getLevelBadgeVariant(team.group.level)}>
                        Level {team.group.level}
                      </Badge>
                      <Badge variant={getGenderBadgeVariant(team.group.gender)}>
                        {team.group.gender}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team Members ({team.members.length})
                </CardTitle>
                {isTeamCreator && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowPlayerMarketModal(true)}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Players
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {team.members.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No team members yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {team.members.map(({ member, user }) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium">
                            {user.display_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}
                          </div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getRoleBadgeVariant(member.role)}>
                          {member.role}
                        </Badge>
                        {isTeamCreator && member.role !== "captain" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(user.id)}
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Free Player Market Modal */}
      {isTeamCreator && (
        <FreePlayerMarketModal
          open={showPlayerMarketModal}
          onOpenChange={setShowPlayerMarketModal}
          teamId={team.team.id}
          level={team.group.level}
          gender={team.group.gender}
          onMemberAdded={loadTeam}
        />
      )}
    </div>
  );
}
