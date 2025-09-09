import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { api } from "./serverComm";

type ServerUser = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  role: string;
  claimed_level?: string;
  level_validation_status: string;
  level_validated_at?: string;
  level_validated_by?: string;
  level_validation_notes?: string;
  created_at: string;
  updated_at: string;
};

type AuthContextType = {
  user: User | null;
  serverUser: ServerUser | null;
  loading: boolean;
  isAdmin: boolean;
  hasValidatedLevel: boolean;
  canCreateTeams: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  serverUser: null,
  loading: true,
  isAdmin: false,
  hasValidatedLevel: false,
  canCreateTeams: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [serverUser, setServerUser] = useState<ServerUser | null>(null);
  const [loading, setLoading] = useState(true);

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

  const isAdmin = serverUser?.role === "admin";
  const hasValidatedLevel = serverUser?.level_validation_status === "approved";
  const canCreateTeams = !isAdmin && hasValidatedLevel;

  return (
    <AuthContext.Provider value={{ 
      user, 
      serverUser, 
      loading, 
      isAdmin, 
      hasValidatedLevel, 
      canCreateTeams 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
