import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { Menu } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";
import { ModeToggle } from "@/components/mode-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { useNavigate } from "react-router-dom";

export function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleProfileClick = () => {
    navigate("/profile");
  };

  return (
    <header className="sticky top-0 z-50 flex items-center h-12 px-2 border-b shrink-0 bg-background">
      <div className="flex items-center">
        <SidebarTrigger className="size-8">
          <Menu className="w-5 h-5" />
        </SidebarTrigger>
        <span className="font-semibold ml-3">My App</span>
      </div>
      <div className="flex items-center gap-3 ml-auto">
        <ModeToggle />
        {user && (
          <UserAvatar
            user={{
              photo_url: user.photoURL,
              first_name: user.displayName?.split(" ")[0],
              last_name: user.displayName?.split(" ")[1],
              email: user.email,
            }}
            onClick={handleProfileClick}
            size="sm"
          />
        )}
        {user && (
          <Button variant="outline" size="sm" onClick={() => signOut(auth)}>
            Sign Out
          </Button>
        )}
      </div>
    </header>
  );
}
