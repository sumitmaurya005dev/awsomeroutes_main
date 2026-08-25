// "use client";

// import {
//   Bell,
//   ChevronsUpDown,
//   HelpCircle,
//   LogOut,
//   Settings,
//   User,
// } from "lucide-react";

// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuGroup,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";

// import {
//   SidebarMenu,
//   SidebarMenuButton,
//   SidebarMenuItem,
// } from "@/components/ui/sidebar";

// interface UserRole {
//   name: string;
//   slug: string;
// }

// interface SidebarUser {
//   firstName: string | null;
//   lastName: string | null;
//   email?: string;
//   avatar?: string | null;
//   role: UserRole;
// }

// interface AppSidebarFooterProps {
//   user: SidebarUser;
// }

// export default function AppSidebarFooter({
//   user,
// }: AppSidebarFooterProps) {
//   return (
//     <SidebarMenu>
//       <SidebarMenuItem>
//         <DropdownMenu>
//           <DropdownMenuTrigger
//             render={
//               <SidebarMenuButton
//                 size="lg"
//                 className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
//               />
//             }
//           >
//             <div className=" flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-semibold text-sm ">
//               {user.firstName?.charAt(0).toUpperCase()}
//             </div>

//             <div className="grid flex-1 text-left leading-tight">
//               <span className="truncate font-medium">
//                 {user.firstName} {user.lastName}
//               </span>

//               <span className="truncate text-xs text-muted-foreground">
//                 {user.role.name}
//               </span>
//             </div>

//             <ChevronsUpDown className="ml-auto h-4 w-4" />
//           </DropdownMenuTrigger>

//           <DropdownMenuContent align="end" side="top" className="min-w-56">
//             <DropdownMenuGroup>
//               <DropdownMenuItem>
//                 <User className="mr-2 h-4 w-4" />
//                 My Profile
//               </DropdownMenuItem>

//               <DropdownMenuItem>
//                 <Settings className="mr-2 h-4 w-4" />
//                 Account Settings
//               </DropdownMenuItem>

//               <DropdownMenuItem>
//                 <Bell className="mr-2 h-4 w-4" />
//                 Notifications
//               </DropdownMenuItem>

//               <DropdownMenuItem>
//                 <HelpCircle className="mr-2 h-4 w-4" />
//                 Help & Support
//               </DropdownMenuItem>
//             </DropdownMenuGroup>

//             <DropdownMenuSeparator />

//             <DropdownMenuItem className="text-red-600">
//               <LogOut className="mr-2 h-4 w-4" />
//               Log Out
//             </DropdownMenuItem>
//           </DropdownMenuContent>
//         </DropdownMenu>
//       </SidebarMenuItem>
//     </SidebarMenu>
//   );
// }


// new code here ----------------------------------------------------------

"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

import { ChevronsUpDown, LogOut, User } from "lucide-react";
import { logoutAction } from "@/actions/auth/logout";

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
  const router = useRouter();
  const initials =
    `${user.firstName?.charAt(0) ?? ""}${user.lastName?.charAt(0) ?? ""}`
      .toUpperCase() || "U";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="
                  h-12
                  rounded-xl
                  px-2

                  transition-all
                  duration-200

                  hover:bg-primary/10
                  hover:text-primary

                  data-[state=open]:bg-primary/10
                  data-[state=open]:text-primary

                  group-data-[collapsible=icon]:mx-auto
                  group-data-[collapsible=icon]:h-10
                  group-data-[collapsible=icon]:w-10
                  group-data-[collapsible=icon]:justify-center
                  group-data-[collapsible=icon]:px-0
                "
              />
            }
          >
            {/* Avatar */}
            <div
              className="
                flex
                h-9 w-9
                shrink-0
                items-center
                justify-center

                rounded-lg

                bg-primary
                text-primary-foreground

                text-sm
                font-semibold

                shadow-sm

                transition-all
                duration-200

                group-data-[collapsible=icon]:h-9
                group-data-[collapsible=icon]:w-9
              "
            >
              {user.avatar ? (
                <Image
                  src={user.avatar}
                  alt={`${user.firstName ?? "User"} profile photo`}
                  width={72}
                  height={72}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </div>

            {/* User Information */}
            <div
              className="
                grid
                min-w-0
                flex-1
                text-left
                leading-tight

                group-data-[collapsible=icon]:hidden
              "
            >
              <span className="truncate text-sm font-semibold">
                {user.firstName} {user.lastName}
              </span>

              <span className="truncate text-xs text-muted-foreground">
                {user.role.name}
              </span>
            </div>

            {/* Arrow */}
            <ChevronsUpDown
              className="
                ml-auto
                h-4 w-4
                shrink-0
                text-muted-foreground

                group-data-[collapsible=icon]:hidden
              "
            />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            side="top"
            sideOffset={8}
            className="
              min-w-56
              rounded-xl
              border-primary/20
              bg-background/95
              shadow-xl
              backdrop-blur-xl
            "
          >
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/home/profile")}>
                <User className="mr-2 h-4 w-4" />
                My Profile
              </DropdownMenuItem>

            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={logoutAction}>
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
