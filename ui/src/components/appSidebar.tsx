import { Home, Settings, FileText, Layers, Calendar, Shield } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
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
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const location = useLocation();
  const { isAdmin } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar
      collapsible="icon"
      className="sticky top-12 h-[calc(100vh-3rem)] z-40"
    >
      <SidebarContent className="overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Home"
                  isActive={isActive("/")}
                  asChild
                >
                  <Link to="/">
                    <Home className="w-4 h-4" />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Page 1"
                  isActive={isActive("/page1")}
                  asChild
                >
                  <Link to="/page1">
                    <FileText className="w-4 h-4" />
                    <span>Page 1</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Page 2"
                  isActive={isActive("/page2")}
                  asChild
                >
                  <Link to="/page2">
                    <Layers className="w-4 h-4" />
                    <span>Page 2</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section - Only visible to admins */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="League Management"
                    isActive={isActive("/admin/leagues")}
                    asChild
                  >
                    <Link to="/admin/leagues">
                      <Calendar className="w-4 h-4" />
                      <span>League Management</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Level Validation"
                    isActive={isActive("/admin/level-validation")}
                    asChild
                  >
                    <Link to="/admin/level-validation">
                      <Shield className="w-4 h-4" />
                      <span>Level Validation</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Settings"
              isActive={isActive("/settings")}
              asChild
            >
              <Link to="/settings">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
