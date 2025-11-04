import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, AlertTriangle } from "lucide-react";
import { api } from "@/lib/serverComm";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";

interface TeamAvailabilityModalProps {
  teamId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface DayAvailability {
  day_of_week: string;
  is_available: boolean;
  start_time: string;
  end_time: string;
}

interface TeamAvailabilityResponse {
  availability: Array<{
    id: string;
    team_id: string;
    day_of_week: string;
    is_available: boolean;
    start_time: string | null;
    end_time: string | null;
    created_at: string;
    updated_at: string;
  }>;
  message: string;
}

const DAYS_OF_WEEK = [
  { key: 'monday', translationKey: 'monday' },
  { key: 'tuesday', translationKey: 'tuesday' },
  { key: 'wednesday', translationKey: 'wednesday' },
  { key: 'thursday', translationKey: 'thursday' },
  { key: 'friday', translationKey: 'friday' },
  { key: 'saturday', translationKey: 'saturday' },
  { key: 'sunday', translationKey: 'sunday' },
];

export function TeamAvailabilityModal({ teamId, open, onOpenChange, onSuccess }: TeamAvailabilityModalProps) {
  const { t } = useTranslation('teams');
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize availability for all days
  useEffect(() => {
    if (open) {
      const initialAvailability = DAYS_OF_WEEK.map(day => ({
        day_of_week: day.key,
        is_available: false,
        start_time: '09:00',
        end_time: '21:00',
      }));
      setAvailability(initialAvailability);
      loadAvailability(initialAvailability);
    }
  }, [open, teamId]);

  const loadAvailability = async (initialAvailability: DayAvailability[]) => {
    setLoading(true);
    setError(null);
    
    try {
      const data: TeamAvailabilityResponse = await api.getTeamAvailability(teamId);
      
      if (data.availability && data.availability.length > 0) {
        // Merge with initial availability to avoid race condition
        const existingAvailability = data.availability;
        const updatedAvailability = initialAvailability.map(day => {
          const existing = existingAvailability.find(e => e.day_of_week === day.day_of_week);
          return existing ? {
            day_of_week: day.day_of_week,
            is_available: existing.is_available,
            start_time: (() => {
              const parsed = parseTime(formatTimeForInput(existing.start_time) || '09:00');
              return formatTimeString(parsed.hours, parsed.minutes);
            })(),
            end_time: (() => {
              const parsed = parseTime(formatTimeForInput(existing.end_time) || '21:00');
              return formatTimeString(parsed.hours, parsed.minutes);
            })(),
          } : day;
        });
        setAvailability(updatedAvailability);
      }
    } catch (err: any) {
      console.error('Failed to load availability:', err);
      setError(err.message || t('failedToLoadAvailability'));
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (dayKey: string, isAvailable: boolean) => {
    setAvailability(prev => prev.map(day => 
      day.day_of_week === dayKey 
        ? { ...day, is_available: isAvailable }
        : day
    ));
  };

  // Generate hour options (09-21)
  const hourOptions = Array.from({ length: 13 }, (_, i) => {
    const hour = i + 9; // 9 to 21
    return String(hour).padStart(2, '0');
  });

  // Minute options (00, 30)
  const minuteOptions = ['00', '30'];

  const parseTime = (time: string): { hours: string; minutes: string } => {
    if (!time) return { hours: '09', minutes: '00' };
    const [hours, minutes] = time.split(':');
    // Ensure minutes are either 00 or 30, default to 00
    const validMinutes = minutes === '30' ? '30' : '00';
    // Ensure hours are between 09-21, default to 09
    const hourNum = parseInt(hours || '9', 10);
    let validHours = String(Math.max(9, Math.min(21, hourNum))).padStart(2, '0');
    return {
      hours: validHours,
      minutes: validMinutes
    };
  };

  const formatTimeString = (hours: string, minutes: string): string => {
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  };

  const handleTimeChange = (dayKey: string, field: 'start_time' | 'end_time', hours: string, minutes: string) => {
    const newTime = formatTimeString(hours, minutes);
    setAvailability(prev => prev.map(day => 
      day.day_of_week === dayKey 
        ? { ...day, [field]: newTime }
        : day
    ));
  };

  // Validate that start time is not greater than end time for available days
  const validateTimeRanges = () => {
    const invalidDays: Array<{ day: string; dayName: string }> = [];
    availability.forEach(day => {
      if (day.is_available && day.start_time && day.end_time) {
        const startTime = parseTime(day.start_time);
        const endTime = parseTime(day.end_time);
        const startMinutes = parseInt(startTime.hours) * 60 + parseInt(startTime.minutes);
        const endMinutes = parseInt(endTime.hours) * 60 + parseInt(endTime.minutes);
        
        if (startMinutes > endMinutes) {
          const dayInfo = DAYS_OF_WEEK.find(d => d.key === day.day_of_week);
          invalidDays.push({ 
            day: day.day_of_week, 
            dayName: dayInfo ? t(dayInfo.translationKey) : day.day_of_week 
          });
        }
      }
    });
    return invalidDays;
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    // Validate that start time is not greater than end time for available days
    const invalidDays = validateTimeRanges();

    if (invalidDays.length > 0) {
      const dayNames = invalidDays.map(d => d.dayName).join(', ');
      setError(`${t('startTimeGreaterThanEndTime') || 'Start time cannot be greater than end time for'}: ${dayNames}`);
      setSaving(false);
      return;
    }

    try {
      await api.updateTeamAvailability(teamId, availability);
      toast.success(t('availabilitySaved') || 'Availability saved');
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error('Failed to save availability:', err);
      setError(err.message || t('failedToSaveAvailability'));
    } finally {
      setSaving(false);
    }
  };

  const formatTimeForInput = (time: string | null) => {
    if (!time) return null;
    // Convert from HH:MM:SS to HH:MM for HTML time input
    return time.substring(0, 5);
  };

  // Validate availability requirements
  const validateAvailability = () => {
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const weekends = ['saturday', 'sunday'];
    
    // Count available weekdays
    const availableWeekdays = availability.filter(day => 
      weekdays.includes(day.day_of_week) && day.is_available
    );
    
    // Check if we have minimum 3 weekdays
    const hasMinimumWeekdays = availableWeekdays.length >= 3;
    
    // Check if any weekday plays until 9:00 PM or later
    const hasLateWeekday = availableWeekdays.some(day => {
      const endTime = day.end_time || '00:00';
      const [hours] = endTime.split(':').map(Number);
      return hours >= 21; // 9:00 PM = 21:00
    });
    
    // Check if any weekend day is available from 9:00 AM to 12:00 PM
    const availableWeekends = availability.filter(day => 
      weekends.includes(day.day_of_week) && day.is_available
    );
    
    const hasValidWeekend = availableWeekends.some(day => {
      const startTime = day.start_time || '00:00';
      const endTime = day.end_time || '00:00';
      const [startHours] = startTime.split(':').map(Number);
      const [endHours] = endTime.split(':').map(Number);
      // Weekend day from 9:00 AM (9) to at least 12:00 PM (12)
      return startHours <= 9 && endHours >= 12;
    });
    
    // Requirements: 3+ weekdays AND (late weekday OR valid weekend)
    const meetsRequirements = hasMinimumWeekdays && (hasLateWeekday || hasValidWeekend);
    
    return {
      meetsRequirements,
      hasMinimumWeekdays,
      hasLateWeekday,
      hasValidWeekend,
    };
  };
  
  const validation = validateAvailability();
  const invalidTimeRanges = validateTimeRanges();
  const hasInvalidTimeRanges = invalidTimeRanges.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(42rem,calc(100%-2rem))] max-h-[80vh] overflow-y-auto p-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {t('teamAvailabilityModalTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('teamAvailabilityModalDescription')}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!validation.meetsRequirements && (
          <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-500/50 rounded-md p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-1">
                  {t('availabilityWarningTitle')}
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 whitespace-pre-line">
                  {t('availabilityWarningDescription')}
                </p>
              </div>
            </div>
          </div>
        )}

        {hasInvalidTimeRanges && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-500/50 rounded-md p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-1">
                  {t('invalidTimeRange') || 'Invalid time range'}
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {t('startTimeGreaterThanEndTime') || 'Start time cannot be greater than end time for'}: {invalidTimeRanges.map(d => d.dayName).join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions under warning */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || hasInvalidTimeRanges}
          >
            {saving ? t('savingAvailability') : t('saveAvailability')}
          </Button>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-muted-foreground">{t('loadingAvailabilityModal')}</span>
            </div>
          ) : (
            availability.map((day) => {
              const dayInfo = DAYS_OF_WEEK.find(d => d.key === day.day_of_week);
              return (
                <Card key={day.day_of_week}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{t(dayInfo?.translationKey || '')}</span>
                      <Switch
                        checked={day.is_available}
                        onCheckedChange={(checked) => handleDayToggle(day.day_of_week, checked)}
                      />
                    </CardTitle>
                  </CardHeader>
                  {day.is_available && (
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm">
                            {t('startTime')}
                          </Label>
                          <div className="flex gap-2">
                            <Select
                              value={parseTime(day.start_time).hours}
                              onValueChange={(hours) => {
                                const { minutes } = parseTime(day.start_time);
                                handleTimeChange(day.day_of_week, 'start_time', hours, minutes);
                              }}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {hourOptions.map(hour => (
                                  <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={parseTime(day.start_time).minutes}
                              onValueChange={(minutes) => {
                                const { hours } = parseTime(day.start_time);
                                handleTimeChange(day.day_of_week, 'start_time', hours, minutes);
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
                        <div>
                          <Label className="text-sm">
                            {t('endTime')}
                          </Label>
                          <div className="flex gap-2">
                            <Select
                              value={parseTime(day.end_time).hours}
                              onValueChange={(hours) => {
                                const { minutes } = parseTime(day.end_time);
                                handleTimeChange(day.day_of_week, 'end_time', hours, minutes);
                              }}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {hourOptions.map(hour => (
                                  <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={parseTime(day.end_time).minutes}
                              onValueChange={(minutes) => {
                                const { hours } = parseTime(day.end_time);
                                handleTimeChange(day.day_of_week, 'end_time', hours, minutes);
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
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>
        
      </DialogContent>
    </Dialog>
  );
}
