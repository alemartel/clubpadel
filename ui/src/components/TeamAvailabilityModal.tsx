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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Calendar } from "lucide-react";
import { api } from "@/lib/serverComm";

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
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export function TeamAvailabilityModal({ teamId, open, onOpenChange, onSuccess }: TeamAvailabilityModalProps) {
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
        end_time: '17:00',
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
            start_time: formatTimeForInput(existing.start_time) || '09:00',
            end_time: formatTimeForInput(existing.end_time) || '17:00',
          } : day;
        });
        setAvailability(updatedAvailability);
      }
    } catch (err: any) {
      console.error('Failed to load availability:', err);
      setError(err.message || 'Failed to load current availability');
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

  const handleTimeChange = (dayKey: string, field: 'start_time' | 'end_time', value: string) => {
    setAvailability(prev => prev.map(day => 
      day.day_of_week === dayKey 
        ? { ...day, [field]: value }
        : day
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      await api.updateTeamAvailability(teamId, availability);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error('Failed to save availability:', err);
      setError(err.message || 'Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '09:00';
    return time.length === 5 ? time : `${time}:00`;
  };

  const formatTimeForInput = (time: string | null) => {
    if (!time) return null;
    // Convert from HH:MM:SS to HH:MM for HTML time input
    return time.substring(0, 5);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Team Availability
          </DialogTitle>
          <DialogDescription>
            Set your team's weekly availability for games. Choose the days and time ranges when your team can play.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-muted-foreground">Loading availability...</span>
            </div>
          ) : (
            availability.map((day) => {
              const dayInfo = DAYS_OF_WEEK.find(d => d.key === day.day_of_week);
              return (
                <Card key={day.day_of_week}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{dayInfo?.label}</span>
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
                          <Label htmlFor={`${day.day_of_week}-start`} className="text-sm">
                            Start Time
                          </Label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                              id={`${day.day_of_week}-start`}
                              type="time"
                              value={formatTime(day.start_time)}
                              onChange={(e) => handleTimeChange(day.day_of_week, 'start_time', e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`${day.day_of_week}-end`} className="text-sm">
                            End Time
                          </Label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                              id={`${day.day_of_week}-end`}
                              type="time"
                              value={formatTime(day.end_time)}
                              onChange={(e) => handleTimeChange(day.day_of_week, 'end_time', e.target.value)}
                              className="pl-10"
                            />
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

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Availability"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
