import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { Menu, LogOut } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";
import { ModeToggle } from "@/components/mode-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";

export function Navbar() {
  const { user, serverUser } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const handleProfileClick = () => {
    navigate("/profile");
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <header className="sticky top-0 z-50 flex items-center h-12 px-2 border-b border-transparent shrink-0 bg-background/60 backdrop-blur-sm">
      <div className="flex items-center">
        <SidebarTrigger className="size-8">
          <Menu className="w-5 h-5" />
        </SidebarTrigger>
        <span className="font-semibold ml-3">Club Padel</span>
      </div>
      <div className="flex items-center gap-3 ml-auto">
        <LanguageSwitcher />
        <ModeToggle />
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
            size="sm"
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
