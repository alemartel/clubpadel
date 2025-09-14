import { Home, Settings, Calendar, Shield, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { setOpen, setOpenMobile, isMobile } = useSidebar();
  const { t } = useTranslation('navigation');

  const isActive = (path: string) => location.pathname === path;

  const handleMenuClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }
  };

  return (
    <Sidebar
      collapsible="icon"
      className="sticky top-12 h-[calc(100vh-3rem)] z-40 bg-background/80 backdrop-blur-sm"
    >
      <SidebarContent className="overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupLabel>{t('navigation')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Home"
                  isActive={isActive("/")}
                  asChild
                >
                  <Link to="/" onClick={handleMenuClick}>
                    <Home className="w-4 h-4" />
                    <span>{t('home')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {/* My Teams - Only visible to non-admin players */}
              {!isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="My Teams"
                    isActive={isActive("/teams")}
                    asChild
                  >
                    <Link to="/teams" onClick={handleMenuClick}>
                      <Users className="w-4 h-4" />
                      <span>{t('myTeams')}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {/* Admin items - Only visible to admins */}
              {isAdmin && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="League Management"
                      isActive={isActive("/admin/leagues")}
                      asChild
                    >
                      <Link to="/admin/leagues" onClick={handleMenuClick}>
                        <Calendar className="w-4 h-4" />
                        <span>{t('leagueManagement')}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Player Management"
                      isActive={isActive("/admin/player-management")}
                      asChild
                    >
                      <Link to="/admin/player-management" onClick={handleMenuClick}>
                        <Shield className="w-4 h-4" />
                        <span>{t('playerManagement')}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Settings"
                      isActive={isActive("/settings")}
                      asChild
                    >
                      <Link to="/settings" onClick={handleMenuClick}>
                        <Settings className="w-4 h-4" />
                        <span>{t('settings')}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {/* Footer content can be added here if needed */}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
