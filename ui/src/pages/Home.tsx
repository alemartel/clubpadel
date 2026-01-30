import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { ProfileWarning } from "@/components/ProfileWarning";
import { PaymentWarning } from "@/components/PaymentWarning";
import { useSidebar } from "@/components/ui/sidebar";
import { api, type TeamWithDetails } from "@/lib/serverComm";

export function Home() {
  const { serverUser, isAdmin, loading } = useAuth();
  const { state } = useSidebar();
  const [userTeams, setUserTeams] = useState<TeamWithDetails[]>([]);

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const response = await api.getMyTeams();
        if (response.teams) {
          setUserTeams(response.teams);
        }
      } catch (error) {
        console.error("Failed to load teams:", error);
      }
    };

    if (!loading && !isAdmin) {
      loadTeams();
    }
  }, [loading, isAdmin]);

  // Calculate positioning based on sidebar state
  // On mobile: center the content normally
  // On desktop: account for sidebar width to keep content centered in available space
  const getContainerClasses = () => {
    if (state === "expanded") {
      // Sidebar is 16rem (256px) when expanded
      // Center the content in the remaining space: left = sidebar width, then center max-w-4xl within remaining space
      return "absolute top-12 left-0 right-0 md:left-64 md:right-0 p-2 sm:p-4 z-10 max-w-4xl mx-auto md:mx-auto";
    }
    if (state === "collapsed") {
      // Sidebar is 3rem (48px) when collapsed to icon
      return "absolute top-12 left-0 right-0 md:left-12 md:right-0 p-2 sm:p-4 z-10 max-w-4xl mx-auto md:mx-auto";
    }
    // Default to expanded
    return "absolute top-12 left-0 right-0 md:left-64 md:right-0 p-2 sm:p-4 z-10 max-w-4xl mx-auto md:mx-auto";
  };

  return (
    <div className="fixed inset-0 w-full h-full">
      <img 
        src="/landing.jpg" 
        alt="My Padel Center" 
        className="w-full h-full object-cover"
      />
      <div className={getContainerClasses()}>
        <ProfileWarning serverUser={serverUser} isAdmin={isAdmin} />
        <PaymentWarning teams={userTeams} isAdmin={isAdmin} serverUser={serverUser} />
      </div>
    </div>
  );
} 