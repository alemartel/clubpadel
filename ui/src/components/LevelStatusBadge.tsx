import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { LevelValidationStatus } from "@/lib/serverComm";

interface LevelStatusBadgeProps {
  status: LevelValidationStatus;
  level?: string;
  notes?: string;
  validatedAt?: string;
  className?: string;
}

export function LevelStatusBadge({
  status,
  level,
  notes,
  validatedAt,
  className,
}: LevelStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "approved":
        return {
          variant: "default" as const,
          className: "bg-green-100 text-green-800 border-green-200",
          icon: CheckCircle,
          label: `Level ${level} Approved`,
        };
      case "pending":
        return {
          variant: "secondary" as const,
          className: "bg-orange-100 text-orange-800 border-orange-200",
          icon: Clock,
          label: `Level ${level} Pending`,
        };
      case "rejected":
        return {
          variant: "destructive" as const,
          className: "bg-red-100 text-red-800 border-red-200",
          icon: XCircle,
          label: `Level ${level} Rejected`,
        };
      case "none":
      default:
        return {
          variant: "outline" as const,
          className: "bg-gray-100 text-gray-600 border-gray-200",
          icon: Minus,
          label: "No Level Claimed",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Badge variant={config.variant} className={cn("flex items-center gap-1", config.className)}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
      {validatedAt && status !== "none" && (
        <span className="text-xs text-muted-foreground">
          {new Date(validatedAt).toLocaleDateString()}
        </span>
      )}
      {notes && status === "rejected" && (
        <div className="text-xs text-red-600 mt-1">
          <strong>Note:</strong> {notes}
        </div>
      )}
    </div>
  );
}
