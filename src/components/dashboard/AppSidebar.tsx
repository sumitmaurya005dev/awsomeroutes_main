import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

import { getCurrentUser } from "@/lib/auth";
import { getUserPermissions } from "@/lib/auth";
import { superAdminNavigation } from "@/config/sidebar-navigation";
import { filterSidebar } from "@/lib/auth";

import AppSidebarHeader from "./AppSidebarHeader";
import AppSidebarNavMain from "./AppsidebarNavMain";
import AppSidebarFooter from "./AppSidebarFooter";

export default async function AppSidebar() {
  const user = await getCurrentUser();

  if (!user || !user.role) return null;

  const permissions = await getUserPermissions();


 const sidebar = filterSidebar(
  superAdminNavigation,
  permissions
);
  return (
    <Sidebar collapsible="icon"  className="shadow-sm">

      <SidebarHeader>
        <AppSidebarHeader />
      </SidebarHeader>

      <SidebarContent>

        <AppSidebarNavMain items={sidebar}/>

      </SidebarContent>

      <SidebarFooter>

        <AppSidebarFooter user={user}/>

      </SidebarFooter>

      <SidebarRail />

    </Sidebar>
  );
}