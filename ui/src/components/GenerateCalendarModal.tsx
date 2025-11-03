import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Loader2 } from "lucide-react";
import { api } from "@/lib/serverComm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GenerateCalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leagueId: string;
  onCalendarGenerated?: () => void;
}

export function GenerateCalendarModal({
  open,
  onOpenChange,
  leagueId,
  onCalendarGenerated,
}: GenerateCalendarModalProps) {
  const [startDate, setStartDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!startDate) {
      setError("Please select a start date");
      return;
    }

    // Validate that the date is in the future
    const selectedDate = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate <= today) {
      setError("Start date must be in the future");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await api.generateLeagueCalendar(leagueId, startDate);
      
      if (response.error) {
        setError(response.error);
      } else {
        // Success - close modal and refresh calendar
        onCalendarGenerated?.();
        onOpenChange(false);
        setStartDate("");
        setError(null);
      }
    } catch (err) {
      setError("Failed to generate calendar");
      console.error("Error generating calendar:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
      setStartDate("");
      setError(null);
    }
  };

  // Set minimum date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Generate League Calendar
          </DialogTitle>
          <DialogDescription>
            Create a match schedule for all teams in this league. Each team will play every other team exactly once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={minDate}
              disabled={loading}
            />
            <p className="text-sm text-muted-foreground">
              Select the date when the league matches should begin
            </p>
          </div>

          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={loading || !startDate}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {loading ? "Generating..." : "Generate Calendar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
