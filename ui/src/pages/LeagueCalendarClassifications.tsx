import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Table2, Loader2, RefreshCw, AlertCircle, Trash2, Info } from "lucide-react";
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
  walk_overs?: number;
  sets_played?: number;
  sets_won?: number;
  games_played?: number;
  games_won?: number;
}

export function LeagueCalendarClassifications() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { t, currentLanguage } = useTranslation('leagues');
  const { t: tCommon } = useTranslation('common');
  const { t: tTeams } = useTranslation('teams');

  const [league, setLeague] = useState<League | null>(null);
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [byes, setByes] = useState<Array<{ team_id: string; team_name: string; week_number: number }>>([]);
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
  const [assignTime, setAssignTime] = useState<string>("09:00");
  const [assigning, setAssigning] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
        
        // Handle bye weeks (from API response)
        const loadedByes = calendarResponse.byes || [];
        setByes(loadedByes);
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

  const getTranslatedError = (errorMessage: string): string => {
    // Try to parse JSON error from API response
    try {
      // Handle format: "API request failed: Bad Request - {"error":"..."}"
      const jsonMatch = errorMessage.match(/\{.*"error":"([^"]+)".*\}/);
      if (jsonMatch && jsonMatch[1]) {
        errorMessage = jsonMatch[1];
      }
      // Also try to extract error from APIError format
      const apiErrorMatch = errorMessage.match(/API request failed:.*?\{.*"error":"([^"]+)".*\}/);
      if (apiErrorMatch && apiErrorMatch[1]) {
        errorMessage = apiErrorMatch[1];
      }
    } catch (e) {
      // If parsing fails, use the original message
    }

    // Handle player conflict error with date extraction
    const playerConflictMatch = errorMessage.match(/Player conflict detected: A player from this match already has another match scheduled on (.+)/);
    if (playerConflictMatch) {
      const dateStr = playerConflictMatch[1];
      return t('playerConflictDetected', { date: dateStr });
    }

    // Map error messages to translation keys
    const errorMap: Record<string, string> = {
      "Start date must be in the future": t('startDateMustBeInFuture'),
      "League not found": t('leagueNotFound'),
      "Invalid start date format": t('invalidStartDateFormat'),
      "Start date is required": t('startDateRequired'),
      "Match date cannot be before league start date": t('matchDateCannotBeBeforeLeagueStartDate'),
    };

    return errorMap[errorMessage] || errorMessage;
  };

  const handleGenerateCalendar = async () => {
    if (!leagueId || !startDate) {
      toast.error(t('pleaseSelectStartDate'));
      return;
    }

    try {
      setGenerating(true);
      const startDateString = startDate.toISOString().split('T')[0];
      const response = await api.generateLeagueCalendar(leagueId, startDateString);

      if (response.error) {
        toast.error(getTranslatedError(response.error));
      } else {
        toast.success(t('calendarGeneratedSuccessfully'));
        setShowGenerateDialog(false);
        setStartDate(undefined);
        await loadData();
      }
    } catch (err: any) {
      const errorMessage = err.message || t('failedToGenerateCalendar');
      toast.error(getTranslatedError(errorMessage));
      console.error("Error generating calendar:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteCalendar = async () => {
    if (!leagueId) return;
    
    try {
      setDeleting(true);
      const response = await api.clearLeagueCalendar(leagueId);
      
      if (response.error) {
        toast.error(response.error || t('failedToRemoveCalendar'));
        return;
      }
      
      toast.success(t('calendarRemovedSuccessfully'));
      setShowDeleteDialog(false);
      
      // Reload data to reflect the deletion
      await loadData();
    } catch (err: any) {
      console.error("Failed to remove calendar:", err);
      toast.error(err.message || t('failedToRemoveCalendar'));
    } finally {
      setDeleting(false);
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

  // Calculate week date range for a given week number
  const getWeekDateRange = (weekNumber: number): { startDate: Date; endDate: Date } | null => {
    if (!league?.start_date) return null;
    
    const leagueStartDate = new Date(league.start_date);
    const weekStartDate = new Date(leagueStartDate);
    weekStartDate.setDate(leagueStartDate.getDate() + (weekNumber - 1) * 7);
    
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);
    
    return { startDate: weekStartDate, endDate: weekEndDate };
  };

  // Format date for display
  const formatDateForDisplay = (date: Date): string => {
    const locale = currentLanguage === 'es' ? 'es-ES' : 'en-US';
    return date.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Generate hour options (09-21) - same as TeamAvailabilityModal
  const hourOptions = Array.from({ length: 13 }, (_, i) => {
    const hour = i + 9; // 9 to 21
    return String(hour).padStart(2, '0');
  });

  // Minute options (00, 30) - same as TeamAvailabilityModal
  const minuteOptions = ['00', '30'];

  const parseTime = (time: string): { hours: string; minutes: string } => {
    if (!time) return { hours: '09', minutes: '00' };
    const [hours, minutes] = time.split(':');
    // Ensure minutes are either 00 or 30, default to 00
    const validMinutes = minutes === '30' ? '30' : '00';
    // Ensure hours are between 09-21, default to 09
    const hourNum = parseInt(hours || '09', 10);
    let validHours = String(Math.max(9, Math.min(21, hourNum))).padStart(2, '0');
    return {
      hours: validHours,
      minutes: validMinutes
    };
  };

  const formatTimeString = (hours: string, minutes: string): string => {
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  };

  const handleTimeChange = (hours: string, minutes: string) => {
    const newTime = formatTimeString(hours, minutes);
    setAssignTime(newTime);
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

  // Group byes by week
  const byesByWeek = byes.reduce((acc, bye) => {
    const week = bye.week_number;
    if (!acc[week]) {
      acc[week] = [];
    }
    acc[week].push(bye);
    return acc;
  }, {} as Record<number, Array<{ team_id: string; team_name: string; week_number: number }>>);

  // Get all weeks (from matches and byes)
  const allWeeks = new Set<number>();
  Object.keys(matchesByWeek).forEach(w => allWeeks.add(Number(w)));
  Object.keys(byesByWeek).forEach(w => allWeeks.add(Number(w)));
  const weeks = Array.from(allWeeks).sort((a, b) => a - b);

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
        <h1 className="text-xl sm:text-2xl font-bold">
          {league?.name || 'League'}
        </h1>
        {league && (
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">
              {t('level')} {league.level}
            </Badge>
            <Badge variant="outline">
              {league.gender === 'male' ? tTeams('masculine') : league.gender === 'female' ? tTeams('femenine') : tTeams('mixed')}
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
              <p className="text-muted-foreground mb-4">{t('noCalendarGenerated')}</p>
              <Button onClick={() => setShowGenerateDialog(true)}>
                <Calendar className="w-4 h-4 mr-2" />
                {t('generateCalendar')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Matches Needing Manual Assignment */}
      {matchesNeedingAssignment.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200 text-base">
              <AlertCircle className="w-4 h-4" />
              {t('matchesNeedingManualAssignment')} ({matchesNeedingAssignment.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {matchesNeedingAssignment.map((matchData) => (
                <div
                  key={matchData.match.id}
                  className="p-3 border border-yellow-300 dark:border-yellow-700 rounded-md bg-white dark:bg-yellow-900/20"
                >
                  <div className="font-medium text-base">
                    {matchData.home_team.name} vs {matchData.away_team.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t('week')} {matchData.match.week_number} - {t('dateNotAssigned')}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setSelectedMatch(matchData);
                      setAssignDate(undefined);
                      setAssignTime("09:00");
                      setShowAssignDialog(true);
                    }}
                  >
                    {t('assignDate')}
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
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-4 h-4" />
              {t('calendar')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {weeks.map((week) => (
                <div key={week} className="border-l-2 border-primary pl-4">
                  <h3 className="font-semibold text-base mb-3">{t('week')} {week}</h3>
                  <div className="space-y-3">
                    {/* Display bye weeks */}
                    {byesByWeek[week]?.map((bye) => (
                      <div
                        key={`bye-${bye.team_id}-${week}`}
                        className="flex items-center justify-between p-4 border border-dashed rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground italic">{bye.team_name}</span>
                          <span className="text-sm text-muted-foreground">- {t('rest')}</span>
                        </div>
                      </div>
                    ))}
                    {/* Display matches */}
                    {(matchesByWeek[week] || []).map((matchData) => (
                      <div
                        key={matchData.match.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex-1">
                              <div className="font-medium text-base">{matchData.home_team.name}</div>
                              <div className="text-sm text-muted-foreground">vs</div>
                              <div className="font-medium text-base">{matchData.away_team.name}</div>
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
          <CardFooter className="justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('removeCalendar')}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Classifications Section */}
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table2 className="w-5 h-5" />
              {t('classifications')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {classifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Table2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{t('noClassificationsAvailable')}</p>
                <p className="text-sm mt-2">{t('classificationsWillAppear')}</p>
              </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-semibold">{t('pos')}</th>
                    <th className="text-left p-2 font-semibold">{t('team')}</th>
                    <th className="text-center p-2 font-semibold">{t('points')}</th>
                    <th className="text-center p-2 font-semibold">{t('wo')}</th>
                    <th className="text-center p-2 font-semibold">{t('matchesPlayed')}</th>
                    <th className="text-center p-2 font-semibold">{t('matchesWon')}</th>
                    <th className="text-center p-2 font-semibold">{t('matchesLost')}</th>
                    <th className="text-center p-2 font-semibold">{t('setsPlayed')}</th>
                    <th className="text-center p-2 font-semibold">{t('setsWon')}</th>
                    <th className="text-center p-2 font-semibold">{t('gamesPlayed')}</th>
                    <th className="text-center p-2 font-semibold">{t('gamesWon')}</th>
                  </tr>
                </thead>
                <tbody>
                  {classifications.map((entry) => (
                    <tr key={entry.team_id} className="border-b hover:bg-accent/50">
                      <td className="p-2 font-medium">{entry.position}</td>
                      <td className="p-2">{entry.team_name}</td>
                      <td className="p-2 text-center font-semibold">{entry.points}</td>
                      <td className="p-2 text-center">{entry.walk_overs ?? 0}</td>
                      <td className="p-2 text-center">{entry.matches_played}</td>
                      <td className="p-2 text-center">{entry.wins}</td>
                      <td className="p-2 text-center">{entry.losses}</td>
                      <td className="p-2 text-center">{entry.sets_played ?? 0}</td>
                      <td className="p-2 text-center">{entry.sets_won ?? 0}</td>
                      <td className="p-2 text-center">{entry.games_played ?? 0}</td>
                      <td className="p-2 text-center">{entry.games_won ?? 0}</td>
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
            <DialogTitle>{t('generateCalendar')}</DialogTitle>
            <DialogDescription className="sr-only !h-0 !m-0 !p-0 !overflow-hidden !leading-none !min-h-0" />
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">{t('startDate')}</Label>
              <DatePicker
                value={startDate}
                onChange={setStartDate}
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
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleGenerateCalendar}
              disabled={generating || !startDate}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('generating')}
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  {t('generate')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual Date Assignment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="p-4">
          <DialogHeader className="text-center">
            <DialogTitle className="text-center">{t('assignMatchDate')}</DialogTitle>
            <DialogDescription className="text-center">
              {selectedMatch && (
                <>{selectedMatch.home_team.name} vs {selectedMatch.away_team.name}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedMatch && league && (() => {
              const weekRange = getWeekDateRange(selectedMatch.match.week_number);
              if (weekRange) {
                return (
                  <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-md border border-border">
                    <Info className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      {t('weekDateRange', {
                        week: selectedMatch.match.week_number,
                        startDate: formatDateForDisplay(weekRange.startDate),
                        endDate: formatDateForDisplay(weekRange.endDate)
                      })}
                    </p>
                  </div>
                );
              }
              return null;
            })()}
            <div className="space-y-2">
              <Label htmlFor="assign-date">{tCommon('date')}</Label>
              <DatePicker
                value={assignDate}
                onChange={setAssignDate}
              />
            </div>
            <div className="space-y-2">
              <Label>{tCommon('time')}</Label>
              <div className="flex gap-2">
                <Select
                  value={parseTime(assignTime).hours}
                  onValueChange={(hours) => {
                    const { minutes } = parseTime(assignTime);
                    handleTimeChange(hours, minutes);
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hourOptions.map(hour => (
                      <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={parseTime(assignTime).minutes}
                  onValueChange={(minutes) => {
                    const { hours } = parseTime(assignTime);
                    handleTimeChange(hours, minutes);
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {minuteOptions.map(minute => (
                      <SelectItem key={minute} value={minute}>{minute}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={async () => {
                if (!leagueId || !selectedMatch || !assignDate || !assignTime) {
                  toast.error(t('pleaseSelectBothDateAndTime'));
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
                    toast.error(getTranslatedError(response.error));
                  } else {
                    toast.success(t('matchDateAssignedSuccessfully'));
                    setShowAssignDialog(false);
                    setSelectedMatch(null);
                    setAssignDate(undefined);
                    setAssignTime("09:00");
                    await loadData();
                  }
                } catch (err: any) {
                  const errorMessage = err.message || t('failedToAssignMatchDate');
                  toast.error(getTranslatedError(errorMessage));
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
                  {t('assigning')}
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  {t('assignDate')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Calendar Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('removeCalendar')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('removeCalendarConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {tCommon('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCalendar}
              disabled={deleting}
              className="bg-black text-white hover:bg-black/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('removing')}
                </>
              ) : (
                tCommon('confirm')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

