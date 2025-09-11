import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Edit, UserPlus, UserMinus, Calendar, Trophy, Clock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, type Team, type TeamMember } from "@/lib/serverComm";
import { getLevelBadgeVariant, getGenderBadgeVariant } from "@/lib/badge-utils";
import { FreePlayerMarketModal } from "../components/FreePlayerMarketModal";
import { TeamAvailabilityModal } from "../components/TeamAvailabilityModal";

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
  const { serverUser, isAdmin } = useAuth();
  const [team, setTeam] = useState<TeamWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPlayerMarketModal, setShowPlayerMarketModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [teamAvailability, setTeamAvailability] = useState<any[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  // Function to get the correct back navigation URL
  const getBackUrl = () => {
    if (isAdmin && team) {
      // If admin and we have team data, go back to admin teams page
      return `/admin/leagues/${team.league.id}/groups/${team.group.id}/teams`;
    }
    // Otherwise, go to user's teams page
    return "/teams";
  };

  useEffect(() => {
    if (id) {
      loadTeam();
    }
  }, [id]);

  useEffect(() => {
    if (team) {
      loadTeamAvailability();
    }
  }, [team]);

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
      setError("Failed to remove team member");
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
      'monday': 'Monday',
      'tuesday': 'Tuesday', 
      'wednesday': 'Wednesday',
      'thursday': 'Thursday',
      'friday': 'Friday',
      'saturday': 'Saturday',
      'sunday': 'Sunday'
    };
    return days[dayKey] || dayKey;
  };


  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "captain": return "default";
      case "member": return "secondary";
      default: return "outline";
    }
  };

  const isTeamCreator = team && serverUser && team.team.created_by === serverUser.id;
  const isTeamMember = team && serverUser && team.members.some(member => member.user.id === serverUser.id);

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
            <Button onClick={() => navigate(getBackUrl())}>
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
        <Button variant="ghost" size="sm" onClick={() => navigate(getBackUrl())}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Teams
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{team.team.name}</h1>
          <p className="text-muted-foreground">
            {team.league.name} • {team.group.name}
          </p>
        </div>
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

              {/* Team Availability */}
              <div className="mt-6">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Team Availability
                </h4>
                {availabilityLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    Loading availability...
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
                        No availability set
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No availability set
                  </div>
                )}
                
                {isTeamMember && (
                  <div className="mt-4 flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setShowAvailabilityModal(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Availability
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

      {/* Team Availability Modal */}
      {isTeamMember && (
        <TeamAvailabilityModal
          open={showAvailabilityModal}
          onOpenChange={setShowAvailabilityModal}
          teamId={team.team.id}
          onSuccess={() => {
            loadTeamAvailability();
          }}
        />
      )}
    </div>
  );
}
