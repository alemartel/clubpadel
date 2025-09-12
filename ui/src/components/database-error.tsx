import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Database } from "lucide-react";
import { useDatabaseHealth } from "@/lib/database-health";
import { useState } from "react";

interface DatabaseErrorProps {
  onRetry?: () => void;
  className?: string;
}

export function DatabaseError({ onRetry, className }: DatabaseErrorProps) {
  const { isHealthy, isConnected, error, lastChecked } = useDatabaseHealth();
  const [isRetrying, setIsRetrying] = useState(false);

  // Don't show error if database is healthy
  if (isHealthy && isConnected) {
    return null;
  }

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const getErrorTitle = () => {
    if (!isConnected) {
      return "Database Connection Lost";
    }
    if (!isHealthy) {
      return "Database Health Issue";
    }
    return "Database Error";
  };

  const getErrorDescription = () => {
    if (!isConnected) {
      return "Unable to connect to the database. Please check if the database server is running and try again.";
    }
    if (!isHealthy) {
      return "The database is connected but experiencing health issues. Some features may not work properly.";
    }
    return error || "An unknown database error occurred.";
  };

  const formatLastChecked = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);

    if (diffSeconds < 60) {
      return `${diffSeconds} seconds ago`;
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minutes ago`;
    } else {
      return date.toLocaleTimeString();
    }
  };

  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        <Database className="h-4 w-4" />
        {getErrorTitle()}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{getErrorDescription()}</p>
        
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Last checked: {formatLastChecked(lastChecked)}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={isRetrying}
            className="ml-2"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-2" />
                Retry
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p className="font-medium">Troubleshooting steps:</p>
          <ul className="list-disc list-inside space-y-1 mt-1">
            <li>Ensure the database server is running</li>
            <li>Check your internet connection</li>
            <li>Try refreshing the page</li>
            <li>Contact support if the issue persists</li>
          </ul>
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Full-screen database error overlay
 */
export function DatabaseErrorOverlay() {
  const { isHealthy, isConnected } = useDatabaseHealth();

  // Don't show overlay if database is healthy
  if (isHealthy && isConnected) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <DatabaseError />
      </div>
    </div>
  );
}
