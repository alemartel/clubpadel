import { useAuth } from "@/lib/auth-context";
import { ProfileWarning } from "@/components/ProfileWarning";
import { useSidebar } from "@/components/ui/sidebar";

export function Home() {
  const { serverUser, isAdmin } = useAuth();
  const { state } = useSidebar();

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
        alt="Club Padel" 
        className="w-full h-full object-cover"
      />
      <div className={getContainerClasses()}>
        <ProfileWarning serverUser={serverUser} isAdmin={isAdmin} />
      </div>
    </div>
  );
} 