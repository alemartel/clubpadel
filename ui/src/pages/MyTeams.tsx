import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Calendar, Trophy } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, type Team } from "@/lib/serverComm";

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
  member_count: number;
}

export function MyTeams() {
  const { canCreateTeams } = useAuth();
  const [teams, setTeams] = useState<TeamWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError("Failed to load teams");
      console.error("Error loading teams:", err);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading your teams...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={loadTeams}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Teams</h1>
          <p className="text-muted-foreground">
            Manage your teams and view team details
          </p>
        </div>
        {canCreateTeams && (
          <Button asChild>
            <Link to="/teams/create">
              <Plus className="w-4 h-4 mr-2" />
              Create Team
            </Link>
          </Button>
        )}
      </div>

      {teams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              {canCreateTeams 
                ? "Create your first team to get started with league play."
                : "You need a validated level to create teams. Update your profile to get your level validated."
              }
            </p>
            {canCreateTeams && (
              <Button asChild>
                <Link to="/teams/create">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Team
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((teamData) => (
            <Card key={teamData.team.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{teamData.team.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {teamData.league.name}
                    </CardDescription>
                  </div>
                  <Badge variant={getLevelBadgeVariant(teamData.group.level)}>
                    Level {teamData.group.level}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Trophy className="w-4 h-4" />
                    <span>{teamData.group.name}</span>
                    <Badge variant={getGenderBadgeVariant(teamData.group.gender)} className="ml-auto">
                      {teamData.group.gender}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{teamData.member_count} member{teamData.member_count !== 1 ? 's' : ''}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {formatDate(teamData.league.start_date)} - {formatDate(teamData.league.end_date)}
                    </span>
                  </div>
                  
                  <div className="pt-2">
                    <Button asChild variant="outline" className="w-full">
                      <Link to={`/teams/${teamData.team.id}`}>
                        View Team Details
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
