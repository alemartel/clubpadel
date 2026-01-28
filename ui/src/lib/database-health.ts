/**
 * Database health check utilities
 */
import { getApiBaseUrl } from "./serverComm";

export interface DatabaseHealthStatus {
  isHealthy: boolean;
  isConnected: boolean;
  error?: string;
  lastChecked: Date;
}

class DatabaseHealthChecker {
  private status: DatabaseHealthStatus = {
    isHealthy: false,
    isConnected: false,
    lastChecked: new Date(),
  };

  private listeners: Set<(status: DatabaseHealthStatus) => void> = new Set();
  private checkInterval: NodeJS.Timeout | null = null;

  /**
   * Check database health by calling the /api/v1/db-test endpoint
   */
  async checkHealth(): Promise<DatabaseHealthStatus> {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/db-test`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.status = {
          isHealthy: data.connectionHealthy || false,
          isConnected: true,
          lastChecked: new Date(),
        };
      } else {
        const errorMsg = `Database connection failed: ${response.status} ${response.statusText}`;
        console.error('[Database Health Check]', errorMsg);
        this.status = {
          isHealthy: false,
          isConnected: false,
          error: errorMsg,
          lastChecked: new Date(),
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown database error';
      console.error('[Database Health Check]', errorMsg, error);
      this.status = {
        isHealthy: false,
        isConnected: false,
        error: errorMsg,
        lastChecked: new Date(),
      };
    }

    this.notifyListeners();
    return this.status;
  }

  /**
   * Get current status without checking
   */
  getStatus(): DatabaseHealthStatus {
    return { ...this.status };
  }

  /**
   * Subscribe to health status changes
   */
  subscribe(listener: (status: DatabaseHealthStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Start periodic health checks
   */
  startPeriodicCheck(intervalMs: number = 30000): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Check immediately
    this.checkHealth();

    // Then check periodically
    this.checkInterval = setInterval(() => {
      this.checkHealth();
    }, intervalMs);
  }

  /**
   * Stop periodic health checks
   */
  stopPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener({ ...this.status });
      } catch (error) {
        console.error('Error in database health listener:', error);
      }
    });
  }
}

// Singleton instance
export const databaseHealthChecker = new DatabaseHealthChecker();

/**
 * Hook to use database health status
 */
export function useDatabaseHealth() {
  const [status, setStatus] = React.useState<DatabaseHealthStatus>(
    databaseHealthChecker.getStatus()
  );

  React.useEffect(() => {
    const unsubscribe = databaseHealthChecker.subscribe(setStatus);
    return unsubscribe;
  }, []);

  return status;
}

// Import React for the hook
import React from 'react';
