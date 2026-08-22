// import {
//   SidebarGroup,
//   SidebarGroupContent,
//   SidebarGroupLabel,
//   SidebarMenu,
// } from "@/components/ui/sidebar";

// import AppSidebarItem from "./AppSidebarItem";

// import type { SidebarItem } from "@/types/sidebar-navigation";

// import { sidebarGroups } from "@/config/sidebar-navigation";
// interface Props {
//   items: SidebarItem[];
// }

// export default function AppSidebarNavMain({
//   items,
// }: Props) {
//   return (
//     <>
//       {sidebarGroups.map((group) => {
//         const groupItems = items.filter((item) =>
//           group.menus.includes(item.title)
//         );

//         if (groupItems.length === 0) {
//           return null;
//         }

//         return (
//           <SidebarGroup key={group.label}>

//             <SidebarGroupLabel>
//               {group.label}
//             </SidebarGroupLabel>

//             <SidebarGroupContent>

//               <SidebarMenu>

//                 {groupItems.map((item) => (
//                   <AppSidebarItem
//                     key={item.title}
//                     item={item}
//                   />
//                 ))}

//               </SidebarMenu>

//             </SidebarGroupContent>

//           </SidebarGroup>
//         );
//       })}
//     </>
//   );
// }

// new code here -------------------------------------------------------

// import {
//   SidebarGroup,
//   SidebarGroupContent,
//   SidebarGroupLabel,
//   SidebarMenu,
// } from "@/components/ui/sidebar";

// import AppSidebarItem from "./AppSidebarItem";

// import type { SidebarItem } from "@/types/sidebar-navigation";

// import { sidebarGroups } from "@/config/sidebar-navigation";

// interface Props {
//   items: SidebarItem[];
// }

// export default function AppSidebarNavMain({
//   items,
// }: Props) {
//   return (
//     <>
//       {sidebarGroups.map((group) => {
//         const groupItems = items.filter((item) =>
//           group.menus.includes(item.title)
//         );

//         if (groupItems.length === 0) {
//           return null;
//         }

//         return (
//           <SidebarGroup key={group.label} className="px-1 py-2">
//             {/* Group heading */}
//             <SidebarGroupLabel className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80 group-data-[collapsible=icon]:hidden">
//               {group.label}
//             </SidebarGroupLabel>

//             <SidebarGroupContent>
//               <SidebarMenu className="gap-1.5">
//                 {groupItems.map((item) => (
//                   <AppSidebarItem
//                     key={item.title}
//                     item={item}
//                   />
//                 ))}
//               </SidebarMenu>
//             </SidebarGroupContent>
//           </SidebarGroup>
//         );
//       })}
//     </>
//   );
// }


//  another new code --------------------------------------
"use client";

import * as React from "react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/components/ui/sidebar";

import AppSidebarItem from "./AppSidebarItem";

import type { SidebarItem } from "@/types/sidebar-navigation";
import { sidebarGroups } from "@/config/sidebar-navigation";

interface Props {
  items: SidebarItem[];
}

export default function AppSidebarNavMain({
  items,
}: Props) {
  const [openParent, setOpenParent] = React.useState<string | null>(null);

  const handleParentToggle = (title: string) => {
    setOpenParent((current) =>
      current === title ? null : title
    );
  };

  return (
    <>
      {sidebarGroups.map((group) => {
        const groupItems = items.filter((item) =>
          group.menus.includes(item.title)
        );

        if (groupItems.length === 0) {
          return null;
        }

        return (
          <SidebarGroup
            key={group.label}
            className="px-1 py-2"
          >
            <SidebarGroupLabel
              className="
                mb-2
                px-3
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.12em]
                text-muted-foreground/80

                group-data-[collapsible=icon]:hidden
              "
            >
              {group.label}
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {groupItems.map((item) => (
                  <AppSidebarItem
                    key={item.title}
                    item={item}
                    isOpen={openParent === item.title}
                    onToggle={() =>
                      handleParentToggle(item.title)
                    }
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        );
      })}
    </>
  );
}