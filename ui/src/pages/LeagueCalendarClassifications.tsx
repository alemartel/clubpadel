import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Calendar, Clock, Table2, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { api, type MatchWithTeams, type League } from "@/lib/serverComm";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";

interface ClassificationEntry {
  team_id: string;
  team_name: string;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  position: number;
}

export function LeagueCalendarClassifications() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { t } = useTranslation('leagues');
  const { t: tCommon } = useTranslation('common');

  const [league, setLeague] = useState<League | null>(null);
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [classifications, setClassifications] = useState<ClassificationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [generating, setGenerating] = useState(false);
  const [matchesNeedingAssignment, setMatchesNeedingAssignment] = useState<MatchWithTeams[]>([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchWithTeams | null>(null);
  const [assignDate, setAssignDate] = useState<Date | undefined>(undefined);
  const [assignTime, setAssignTime] = useState<string>("10:00");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (leagueId) {
      loadData();
    }
  }, [leagueId]);

  const loadData = async () => {
    if (!leagueId) return;

    try {
      setLoading(true);
      setError(null);

      // Load league info
      const leagueResponse = await api.getLeague(leagueId);
      if (leagueResponse.error) {
        setError(leagueResponse.error);
        return;
      }
      setLeague(leagueResponse.league);

      // Load calendar
      const calendarResponse = await api.getLeagueCalendar(leagueId);
      if (calendarResponse.error && calendarResponse.error !== "No matches found") {
        setError(calendarResponse.error);
      } else {
        const loadedMatches = calendarResponse.matches || [];
        setMatches(loadedMatches);
        
        // Handle matches needing assignment (from API response)
        const needsAssignment = calendarResponse.needsAssignment || [];
        setMatchesNeedingAssignment(needsAssignment);
      }

      // Load classifications
      const classificationsResponse = await api.getLeagueClassifications(leagueId);
      if (classificationsResponse.error && classificationsResponse.error !== "No matches found") {
        console.error("Error loading classifications:", classificationsResponse.error);
      } else {
        setClassifications(classificationsResponse.classifications || []);
      }
    } catch (err) {
      setError("Failed to load data");
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCalendar = async () => {
    if (!leagueId || !startDate) {
      toast.error("Please select a start date");
      return;
    }

    try {
      setGenerating(true);
      const startDateString = startDate.toISOString().split('T')[0];
      const response = await api.generateLeagueCalendar(leagueId, startDateString);

      if (response.error) {
        toast.error(response.error);
      } else {
        toast.success("Calendar generated successfully");
        setShowGenerateDialog(false);
        setStartDate(undefined);
        await loadData();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate calendar");
      console.error("Error generating calendar:", err);
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not assigned';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading...</span>
      </div>
    );
  }

  if (error && !league) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-4">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">
          {league?.name || 'League'}
        </h1>
        {league && (
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">
              Level {league.level}
            </Badge>
            <Badge variant="outline">
              {league.gender === 'male' ? 'Masculine' : league.gender === 'female' ? 'Femenine' : 'Mixed'}
            </Badge>
          </div>
        )}
      </div>

      {/* Generate Calendar Button (if no matches) */}
      {matches.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">No calendar has been generated yet.</p>
              <Button onClick={() => setShowGenerateDialog(true)}>
                <Calendar className="w-4 h-4 mr-2" />
                Generate Calendar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Matches Needing Manual Assignment */}
      {matchesNeedingAssignment.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertCircle className="w-5 h-5" />
              Matches Needing Manual Assignment ({matchesNeedingAssignment.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {matchesNeedingAssignment.map((matchData) => (
                <div
                  key={matchData.match.id}
                  className="p-3 border border-yellow-300 dark:border-yellow-700 rounded-md bg-white dark:bg-yellow-900/20"
                >
                  <div className="font-medium">
                    {matchData.home_team.name} vs {matchData.away_team.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Week {matchData.match.week_number} - Date not assigned
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setSelectedMatch(matchData);
                      setAssignDate(undefined);
                      setAssignTime("10:00");
                      setShowAssignDialog(true);
                    }}
                  >
                    Assign Date
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar Section */}
      {matches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {weeks.map((week) => (
                <div key={week} className="border-l-2 border-primary pl-4">
                  <h3 className="font-semibold text-lg mb-3">Week {week}</h3>
                  <div className="space-y-3">
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
                          {matchData.match.match_date && (
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
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Classifications Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Table2 className="w-5 h-5" />
            Classifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {classifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Table2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No classifications available yet.</p>
              <p className="text-sm mt-2">Classifications will appear after match results are recorded.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-semibold">Pos</th>
                    <th className="text-left p-2 font-semibold">Team</th>
                    <th className="text-center p-2 font-semibold">MP</th>
                    <th className="text-center p-2 font-semibold">W</th>
                    <th className="text-center p-2 font-semibold">D</th>
                    <th className="text-center p-2 font-semibold">L</th>
                    <th className="text-center p-2 font-semibold">GF</th>
                    <th className="text-center p-2 font-semibold">GA</th>
                    <th className="text-center p-2 font-semibold">GD</th>
                    <th className="text-center p-2 font-semibold">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {classifications.map((entry) => (
                    <tr key={entry.team_id} className="border-b hover:bg-accent/50">
                      <td className="p-2 font-medium">{entry.position}</td>
                      <td className="p-2">{entry.team_name}</td>
                      <td className="p-2 text-center">{entry.matches_played}</td>
                      <td className="p-2 text-center">{entry.wins}</td>
                      <td className="p-2 text-center">{entry.draws}</td>
                      <td className="p-2 text-center">{entry.losses}</td>
                      <td className="p-2 text-center">{entry.goals_for}</td>
                      <td className="p-2 text-center">{entry.goals_against}</td>
                      <td className="p-2 text-center">{entry.goal_difference >= 0 ? '+' : ''}{entry.goal_difference}</td>
                      <td className="p-2 text-center font-semibold">{entry.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Calendar Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Calendar</DialogTitle>
            <DialogDescription>
              Generate a round-robin schedule for all teams in this league. The system will consider team availability and avoid scheduling conflicts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <DatePicker
                date={startDate}
                onDateChange={setStartDate}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowGenerateDialog(false);
                setStartDate(undefined);
              }}
              disabled={generating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateCalendar}
              disabled={generating || !startDate}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Date Assignment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Match Date</DialogTitle>
            <DialogDescription>
              {selectedMatch && (
                <>Assign date and time for {selectedMatch.home_team.name} vs {selectedMatch.away_team.name}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="assign-date">Date</Label>
              <DatePicker
                date={assignDate}
                onDateChange={setAssignDate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assign-time">Time</Label>
              <input
                id="assign-time"
                type="time"
                value={assignTime}
                onChange={(e) => setAssignTime(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAssignDialog(false);
                setSelectedMatch(null);
                setAssignDate(undefined);
                setAssignTime("10:00");
              }}
              disabled={assigning}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!leagueId || !selectedMatch || !assignDate || !assignTime) {
                  toast.error("Please select both date and time");
                  return;
                }

                try {
                  setAssigning(true);
                  const dateString = assignDate.toISOString().split('T')[0];
                  const response = await api.updateMatchDate(
                    leagueId,
                    selectedMatch.match.id,
                    dateString,
                    assignTime
                  );

                  if (response.error) {
                    toast.error(response.error);
                  } else {
                    toast.success("Match date assigned successfully");
                    setShowAssignDialog(false);
                    setSelectedMatch(null);
                    setAssignDate(undefined);
                    setAssignTime("10:00");
                    await loadData();
                  }
                } catch (err: any) {
                  toast.error(err.message || "Failed to assign match date");
                  console.error("Error assigning match date:", err);
                } finally {
                  setAssigning(false);
                }
              }}
              disabled={assigning || !assignDate || !assignTime}
            >
              {assigning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Assign Date
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

