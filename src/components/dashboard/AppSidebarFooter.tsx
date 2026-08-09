"use client";

import {
  Bell,
  ChevronsUpDown,
  HelpCircle,
  LogOut,
  Settings,
  User,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface UserRole {
  name: string;
  slug: string;
}

interface SidebarUser {
  firstName: string | null;
  lastName: string | null;
  email?: string;
  avatar?: string | null;
  role: UserRole;
}

interface AppSidebarFooterProps {
  user: SidebarUser;
}

export default function AppSidebarFooter({
  user,
}: AppSidebarFooterProps) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
          >
            <div className=" flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-semibold text-sm ">
              {user.firstName?.charAt(0).toUpperCase()}
            </div>

            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate font-medium">
                {user.firstName} {user.lastName}
              </span>

              <span className="truncate text-xs text-muted-foreground">
                {user.role.name}
              </span>
            </div>

            <ChevronsUpDown className="ml-auto h-4 w-4" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" side="top" className="min-w-56">
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                My Profile
              </DropdownMenuItem>

              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Account Settings
              </DropdownMenuItem>

              <DropdownMenuItem>
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </DropdownMenuItem>

              <DropdownMenuItem>
                <HelpCircle className="mr-2 h-4 w-4" />
                Help & Support
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}