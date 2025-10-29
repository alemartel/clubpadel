import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { api } from "./serverComm";
import { databaseHealthChecker, type DatabaseHealthStatus } from "./database-health";

type ServerUser = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  role: string;
  profile_picture_url?: string;
  created_at: string;
  updated_at: string;
};

type AuthContextType = {
  user: User | null;
  serverUser: ServerUser | null;
  loading: boolean;
  isAdmin: boolean;
  canCreateTeams: boolean;
  databaseHealth: DatabaseHealthStatus;
  checkDatabaseHealth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  serverUser: null,
  loading: true,
  isAdmin: false,
  canCreateTeams: false,
  databaseHealth: {
    isHealthy: false,
    isConnected: false,
    lastChecked: new Date(),
  },
  checkDatabaseHealth: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [serverUser, setServerUser] = useState<ServerUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [databaseHealth, setDatabaseHealth] = useState<DatabaseHealthStatus>({
    isHealthy: false,
    isConnected: false,
    lastChecked: new Date(),
  });

  // Database health monitoring
  useEffect(() => {
    const unsubscribe = databaseHealthChecker.subscribe(setDatabaseHealth);
    
    // Start periodic health checks
    databaseHealthChecker.startPeriodicCheck(30000); // Check every 30 seconds
    
    // Initial health check
    databaseHealthChecker.checkHealth();

    return () => {
      unsubscribe();
      databaseHealthChecker.stopPeriodicCheck();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      if (user) {
        try {
          // Add a small delay to ensure the token is ready
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Fetch server user data to get role information
          const response = await api.getCurrentUser();
          setServerUser(response.user);
        } catch (error) {
          console.error("Failed to fetch server user data:", error);
          setServerUser(null);
        }
      } else {
        setServerUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const checkDatabaseHealth = async () => {
    await databaseHealthChecker.checkHealth();
  };

  const isAdmin = serverUser?.role === "admin";
  const canCreateTeams = !isAdmin;

  return (
    <AuthContext.Provider value={{ 
      user, 
      serverUser, 
      loading, 
      isAdmin, 
      canCreateTeams,
      databaseHealth,
      checkDatabaseHealth
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
