import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LevelStatusBadge } from "./LevelStatusBadge";
import { LevelValidationStatus } from "@/lib/serverComm";
import { cn } from "@/lib/utils";

interface LevelSelectorProps {
  value?: string;
  onChange: (level: string) => void;
  disabled?: boolean;
  validationStatus: LevelValidationStatus;
  notes?: string;
  validatedAt?: string;
  className?: string;
}

export function LevelSelector({
  value,
  onChange,
  disabled,
  validationStatus,
  notes,
  validatedAt,
  className,
}: LevelSelectorProps) {
  const isDisabled = disabled || validationStatus === "pending";

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2">
        <label className="text-sm font-medium">Player Level</label>
        <Select
          value={value}
          onValueChange={onChange}
          disabled={isDisabled}
        >
          <SelectTrigger className={cn(isDisabled && "opacity-50")}>
            <SelectValue placeholder="Select your level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Level 1 - Expert</SelectItem>
            <SelectItem value="2">Level 2 - Advanced</SelectItem>
            <SelectItem value="3">Level 3 - Intermediate</SelectItem>
            <SelectItem value="4">Level 4 - Beginner</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <LevelStatusBadge
        status={validationStatus}
        level={value}
        notes={notes}
        validatedAt={validatedAt}
      />
      
      {validationStatus === "pending" && (
        <p className="text-sm text-orange-600">
          Your level change request is pending admin approval. You cannot make changes until it's reviewed.
        </p>
      )}
    </div>
  );
}
