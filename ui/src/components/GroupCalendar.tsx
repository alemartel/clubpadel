import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, RefreshCw } from "lucide-react";
import { api, type MatchWithTeams } from "@/lib/serverComm";

interface GroupCalendarProps {
  groupId: string;
  loading?: boolean;
  onRefresh?: () => void;
}

export function GroupCalendar({ groupId, loading: externalLoading = false, onRefresh }: GroupCalendarProps) {
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (groupId) {
      loadCalendar();
    }
  }, [groupId]);

  // Refresh calendar when onRefresh is called
  useEffect(() => {
    if (onRefresh) {
      loadCalendar();
    }
  }, [onRefresh]);

  const loadCalendar = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getGroupCalendar(groupId);
      
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

  const formatDate = (dateString: string) => {
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
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>{externalLoading ? "Generating calendar..." : "Loading calendar..."}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={loadCalendar} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No calendar generated yet</p>
        <p className="text-sm">Generate a calendar to see match schedules</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <Button onClick={loadCalendar} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
      <div className="space-y-6">
          {weeks.map((week) => (
            <div key={week} className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Week {week}</Badge>
                <span className="text-sm text-muted-foreground">
                  {matchesByWeek[week].length} match{matchesByWeek[week].length !== 1 ? 'es' : ''}
                </span>
              </div>
              
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {matchesByWeek[week].map((matchData) => (
                  <Card key={matchData.match.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(matchData.match.match_date)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{formatTime(matchData.match.match_time)}</span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="font-medium">{matchData.home_team.name}</div>
                            <div className="text-sm text-muted-foreground">vs</div>
                            <div className="font-medium">{matchData.away_team.name}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
