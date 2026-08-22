// import Link from "next/link";
// import { ChevronDown, UserCircle2 } from "lucide-react";

// import {
//   Sidebar,
//   SidebarHeader,
//   SidebarMenu,
//   SidebarMenuButton,
//   SidebarMenuItem,
  
// } from "@/components/ui/sidebar";

// import { getCurrentUser } from "@/lib/auth/get-current-user";
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";

// export default async function AppSidebarHeader() {

//   const user = await getCurrentUser();

//   return (
   
//   <SidebarHeader>
//     <SidebarMenu>
//       <SidebarMenuItem>
//           <SidebarMenuButton>
//             <Link href="/">
//               {/* add a logo using image next image tag */}
//             <span>AwesomeRoutes</span>
//             </Link>
//           </SidebarMenuButton>
//         </SidebarMenuItem>
//     </SidebarMenu>
//   </SidebarHeader>

//   );
// }




// new code here-----------------------------------------------

import Link from "next/link";
import { Map } from "lucide-react";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export default function AppSidebarHeader() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          render={<Link href="/" />}
          tooltip="AwesomeRoutes"
          className="
            h-12
            rounded-xl
            px-2

            text-primary

            transition-all
            duration-200

            hover:bg-primary/10
            hover:text-primary

            group-data-[collapsible=icon]:mx-auto
            group-data-[collapsible=icon]:h-10
            group-data-[collapsible=icon]:w-10
            group-data-[collapsible=icon]:justify-center
            group-data-[collapsible=icon]:px-0
          "
        >
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

              shadow-sm
            "
          >
            <Map className="h-5 w-5" />
          </div>

          <span
            className="
              truncate
              text-base
              font-bold

              group-data-[collapsible=icon]:hidden
            "
          >
            AwesomeRoutes
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}