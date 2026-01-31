import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { Menu, LogOut, ArrowLeft } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";
import { UserAvatar } from "@/components/user-avatar";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";

export function Navbar() {
  const { user, serverUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('common');

  // Check if we're on a team detail page, profile page, or league calendar page
  const isTeamDetailPage = location.pathname.match(/^\/teams\/[^\/]+$/);
  const isProfilePage = location.pathname === "/profile";
  const isLeagueCalendarPage = location.pathname.match(/^\/admin\/leagues\/[^\/]+\/calendar-classifications$/);

  const handleProfileClick = () => {
    navigate("/profile");
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/inicio");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleBack = () => {
    if (isTeamDetailPage) {
      navigate("/teams");
    } else if (isProfilePage) {
      navigate("/inicio");
    } else if (isLeagueCalendarPage) {
      navigate("/admin/leagues");
    } else {
      navigate(-1);
    }
  };

  return (
    <header className="sticky top-0 z-50 flex items-center h-12 px-2 border-b border-border shrink-0 bg-[#F1F5F9] text-foreground backdrop-blur-sm [&_button]:text-foreground [&_button:hover]:bg-black/5 [&_button:hover]:text-foreground [&_[data-sidebar-trigger]]:text-foreground">
      <div className="flex items-center">
        <SidebarTrigger className="size-8">
          <Menu className="w-5 h-5" />
        </SidebarTrigger>
        {(isTeamDetailPage || isProfilePage || isLeagueCalendarPage) ? (
          <Button variant="ghost" size="sm" onClick={handleBack} className="ml-3 h-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        ) : (
          <div className="flex items-center gap-2 ml-3">
            <img
              src="/Icon_transparent.png"
              alt="My Padel Center"
              className="h-6 w-6 object-contain"
            />
            <img
              src="/Name_lightwhiteback_mini.png"
              alt="My Padel Center"
              className="h-6 object-contain"
            />
          </div>
        )}
      </div>
      <div className="flex items-center gap-3 ml-auto">
        {user && serverUser && (
          <UserAvatar
            user={{
              photo_url: user.photoURL,
              profile_picture_url: serverUser.profile_picture_url,
              first_name: serverUser.first_name || user.displayName?.split(" ")[0],
              last_name: serverUser.last_name || user.displayName?.split(" ")[1],
              email: user.email,
            }}
            onClick={handleProfileClick}
            size="md"
          />
        )}
        {user && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSignOut} 
            title={t('signOut')}
            className="bg-red-50 hover:bg-red-100 text-red-600 border-red-200 hover:border-red-300"
          >
            <LogOut className="w-4 h-4" />
            <span className="sr-only">{t('signOut')}</span>
          </Button>
        )}
      </div>
    </header>
  );
}
