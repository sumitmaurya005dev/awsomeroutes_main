import Link from "next/link";
import { ChevronDown, UserCircle2 } from "lucide-react";

import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  
} from "@/components/ui/sidebar";

import { getCurrentUser } from "@/lib/auth/get-current-user";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";

export default async function AppSidebarHeader() {

  const user = await getCurrentUser();

  return (
   
  <SidebarHeader>
    <SidebarMenu>
      <SidebarMenuItem>
          <SidebarMenuButton>
            <Link href="/">
              {/* add a logo using image next image tag */}
            <span>AwesomeRoutes</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
    </SidebarMenu>
  </SidebarHeader>

  );
}