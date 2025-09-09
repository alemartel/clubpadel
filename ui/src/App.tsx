import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ThemeProvider } from "@/components/theme-provider";
import { LoginForm } from "@/components/login-form";
import { Navbar } from "@/components/navbar";
import { AppSidebar } from "@/components/appSidebar";
import { Home } from "@/pages/Home";
import { Settings } from "@/pages/Settings";
import { Page1 } from "@/pages/Page1";
import { Page2 } from "@/pages/Page2";
import { Profile } from "@/pages/Profile";
import { AdminLeagues } from "@/pages/AdminLeagues";
import { AdminGroups } from "@/pages/AdminGroups";
import { AdminTeams } from "@/pages/AdminTeams";
import { AdminLevelValidation } from "@/pages/AdminLevelValidation";
import { MyTeams } from "./pages/MyTeams";
import { CreateTeam } from "./pages/CreateTeam";
import { TeamDetail } from "./pages/TeamDetail";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

// Admin route protection component
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Checking admin access...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Navigate to="/" replace state={{ error: "Admin access required" }} />
    );
  }

  return <>{children}</>;
}

// Team creation route protection component
function TeamCreationRoute({ children }: { children: React.ReactNode }) {
  const { canCreateTeams, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Checking team creation access...</div>
      </div>
    );
  }

  if (!canCreateTeams) {
    return (
      <Navigate to="/" replace state={{ error: "You need a validated level to create teams" }} />
    );
  }

  return <>{children}</>;
}

// Component to handle redirecting new users to home page
function AuthRedirectHandler() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect if:
    // 1. User is authenticated
    // 2. Not loading
    // 3. Not on home page
    // 4. This is a fresh login (not a page refresh)
    if (!loading && user && location.pathname !== "/") {
      // Check if this is a fresh login by looking at sessionStorage
      const hasRedirectedThisSession = sessionStorage.getItem('hasRedirectedThisSession');
      
      if (!hasRedirectedThisSession) {
        // This is a fresh login, redirect to home
        navigate("/", { replace: true });
        sessionStorage.setItem('hasRedirectedThisSession', 'true');
      }
    }
  }, [user, loading, location.pathname, navigate]);

  // Reset redirect flag when user signs out
  useEffect(() => {
    if (!user) {
      sessionStorage.removeItem('hasRedirectedThisSession');
    }
  }, [user]);

  return null; // This component doesn't render anything
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen"></div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex flex-col w-full min-h-screen bg-background">
        <Navbar />
        {!user ? (
          <main className="flex flex-col items-center justify-center flex-1 p-4">
            <LoginForm />
          </main>
        ) : (
          <div className="flex flex-1">
            <AuthRedirectHandler />
            <AppSidebar />
            <SidebarInset className="flex-1">
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/page1" element={<Page1 />} />
                  <Route path="/page2" element={<Page2 />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route
                    path="/admin/leagues"
                    element={
                      <AdminRoute>
                        <AdminLeagues />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/leagues/:leagueId/groups"
                    element={
                      <AdminRoute>
                        <AdminGroups />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/leagues/:leagueId/groups/:groupId/teams"
                    element={
                      <AdminRoute>
                        <AdminTeams />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/level-validation"
                    element={
                      <AdminRoute>
                        <AdminLevelValidation />
                      </AdminRoute>
                    }
                  />
                  <Route path="/teams" element={<MyTeams />} />
                  <Route
                    path="/teams/create"
                    element={
                      <TeamCreationRoute>
                        <CreateTeam />
                      </TeamCreationRoute>
                    }
                  />
                  <Route path="/teams/:id" element={<TeamDetail />} />
                </Routes>
              </main>
            </SidebarInset>
          </div>
        )}
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        storageKey="volo-app-theme"
      >
        <Router>
          <AppContent />
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
