import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, RefreshCw, Loader2 } from "lucide-react";
import { api, type MatchWithTeams } from "@/lib/serverComm";

interface LeagueCalendarProps {
  leagueId: string;
  loading?: boolean;
}

export function LeagueCalendar({ leagueId, loading: externalLoading = false }: LeagueCalendarProps) {
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (leagueId) {
      loadCalendar();
    }
  }, [leagueId]);


  const loadCalendar = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getLeagueCalendar(leagueId);
      
      if (response.error) {
        setError(response.error);
      } else {
        setMatches(response.matches || []);
      }
    } catch (err) {
      setError("Failed to load calendar");
      console.error("Error loading calendar:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string  | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Group matches by week
  const matchesByWeek = matches.reduce((acc, matchData) => {
    const week = matchData.match.week_number;
    if (!acc[week]) {
      acc[week] = [];
    }
    acc[week].push(matchData);
    return acc;
  }, {} as Record<number, MatchWithTeams[]>);

  const weeks = Object.keys(matchesByWeek)
    .map(Number)
    .sort((a, b) => a - b);

  if (loading || externalLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>{externalLoading ? "Generating calendar..." : "Loading calendar..."}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
        <p>{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={loadCalendar}
          className="mt-3"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No matches scheduled yet.</p>
        <p className="text-sm mt-2">Generate a calendar to create match schedules.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {weeks.map((week) => (
        <Card key={week}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Week {week}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {matchesByWeek[week].map((matchData) => (
                <div
                  key={matchData.match.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1">
                        <div className="font-medium">{matchData.home_team.name}</div>
                        <div className="text-sm text-muted-foreground">vs</div>
                        <div className="font-medium">{matchData.away_team.name}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(matchData.match.match_date)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatTime(matchData.match.match_time)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

