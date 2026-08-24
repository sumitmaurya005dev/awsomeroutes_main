// "use client";

// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import { ChevronRight } from "lucide-react";
// import * as React from "react";

// import {
//   Collapsible,
//   CollapsibleContent,
//   CollapsibleTrigger,
// } from "@/components/ui/collapsible";

// import {
//   SidebarMenuButton,
//   SidebarMenuItem,
//   SidebarMenuSub,
//   SidebarMenuSubButton,
//   SidebarMenuSubItem,
// } from "@/components/ui/sidebar";

// import type { SidebarItem } from "@/types/sidebar-navigation";
// import { sidebarIcons } from "@/lib/sidebar-icons";

// interface AppSidebarItemProps {
//   item: SidebarItem;
// }

// export default function AppSidebarItem({
//   item,
// }: AppSidebarItemProps) {
//   const pathname = usePathname();

//   const isActive = item.href === pathname;

//   const isParentActive =
//     item.children?.some((child) =>
//       pathname.startsWith(child.href ?? "")
//     ) ?? false;

//   const Icon = sidebarIcons[item.icon];

//   // Controlled open state for parent menu
//   const [open, setOpen] = React.useState(isParentActive);

//   // Keep the submenu open when current route belongs to it
  
//   React.useEffect(() => {
//     if (isParentActive) {
//       setOpen(true);
//     }
//   }, [isParentActive]);

//   // ===============================
//   // Simple Menu Item
//   // ===============================
//   if (!item.children?.length) {
//     return (
//       <SidebarMenuItem>
//         <SidebarMenuButton
//           render={<Link href={item.href ?? "#"} />}
//           isActive={isActive}
//           tooltip={item.title}
//         >
//           <Icon className="h-4 w-4" />
//           <span>{item.title}</span>
//         </SidebarMenuButton>
//       </SidebarMenuItem>
//     );
//   }

//   // ===============================
//   // Parent Menu with Submenu
//   // ===============================
//   return (
//     <Collapsible
//       open={open}
//       onOpenChange={setOpen}
//       className="group/collapsible"
//     >
//       <SidebarMenuItem>
//         <CollapsibleTrigger
//           render={
//             <SidebarMenuButton tooltip={item.title} />
//           }
//         >
//           <Icon className="h-4 w-4" />

//           <span>{item.title}</span>

//           <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
//         </CollapsibleTrigger>

//         <CollapsibleContent>
//           <SidebarMenuSub>
//             {item.children.map((child) => {
//               const ChildIcon = sidebarIcons[child.icon];

//               return (
//                 <SidebarMenuSubItem key={child.title}>
//                   <SidebarMenuSubButton
//                     render={
//                       <Link href={child.href ?? "#"} />
//                     }
//                     isActive={pathname === child.href}
//                   >
//                     <ChildIcon className="h-4 w-4" />

//                     <span>{child.title}</span>
//                   </SidebarMenuSubButton>
//                 </SidebarMenuSubItem>
//               );
//             })}
//           </SidebarMenuSub>
//         </CollapsibleContent>
//       </SidebarMenuItem>
//     </Collapsible>
//   );
// }



// new code here --------------------------------------

// "use client";

// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import { ChevronRight } from "lucide-react";
// import * as React from "react";

// import {
//   Collapsible,
//   CollapsibleContent,
//   CollapsibleTrigger,
// } from "@/components/ui/collapsible";

// import {
//   SidebarMenuButton,
//   SidebarMenuItem,
//   SidebarMenuSub,
//   SidebarMenuSubButton,
//   SidebarMenuSubItem,
// } from "@/components/ui/sidebar";

// import type { SidebarItem } from "@/types/sidebar-navigation";
// import { sidebarIcons } from "@/lib/sidebar-icons";

// interface AppSidebarItemProps {
//   item: SidebarItem;
// }

// export default function AppSidebarItem({
//   item,
// }: AppSidebarItemProps) {
//   const pathname = usePathname();

//   const isActive = item.href === pathname;

//   const isParentActive =
//     item.children?.some((child) =>
//       pathname.startsWith(child.href ?? "")
//     ) ?? false;

//   const Icon = sidebarIcons[item.icon];

//   const [open, setOpen] = React.useState(isParentActive);

//   const isOpen = isParentActive || open;

//   /* =========================================
//      SIMPLE MENU ITEM
//   ========================================== */

//   if (!item.children?.length) {
//     return (
//       <SidebarMenuItem>
//         <SidebarMenuButton
//           render={<Link href={item.href ?? "#"} />}
//           isActive={isActive}
//           tooltip={item.title}
//           className="h-11 rounded-xl px-3 text-[15px] font-medium text-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-sm group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-11 group-data-[collapsible=icon]:w-11 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
//         >
//           <Icon className="h-5 w-5 shrink-0 text-muted-foreground transition-colors group-data-[collapsible=icon]:text-foreground" />

//           <span className="truncate group-data-[collapsible=icon]:hidden">
//             {item.title}
//           </span>
//         </SidebarMenuButton>
//       </SidebarMenuItem>
//     );
//   }

//   /* =========================================
//      PARENT MENU WITH SUBMENU
//   ========================================== */

//   return (
//     <Collapsible
//       open={open}
//       onOpenChange={setOpen}
//       className="group/collapsible"
//     >
//       <SidebarMenuItem>
//         <CollapsibleTrigger
//           render={
//             <SidebarMenuButton
//               tooltip={item.title}
//               isActive={isParentActive}
//               className="h-11 rounded-xl px-3 text-[15px] font-medium transition-all duration-200 hover:bg-primary/10 hover:text-primary data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-sm group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
//             />
//           }
//         >
//           <Icon className="h-5 w-5 shrink-0" />

//           <span className="truncate group-data-[collapsible=icon]:hidden">
//             {item.title}
//           </span>

//           <ChevronRight className="ml-auto h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
//         </CollapsibleTrigger>

//         <CollapsibleContent>
//           <SidebarMenuSub className="ml-3 border-l border-primary/15 pl-3 group-data-[collapsible=icon]:hidden">
//             {item.children.map((child) => {
//               const ChildIcon = sidebarIcons[child.icon];

//               const childActive = pathname === child.href;

//               return (
//                 <SidebarMenuSubItem key={child.title}>
//                   <SidebarMenuSubButton
//                     render={
//                       <Link href={child.href ?? "#"} />
//                     }
//                     isActive={childActive}
//                     className="h-10 rounded-lg px-3 text-sm font-medium transition-all duration-200 hover:bg-primary/10 hover:text-primary data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-semibold"
//                   >
//                     <ChildIcon className="h-4 w-4 shrink-0" />

//                     <span className="truncate">
//                       {child.title}
//                     </span>
//                   </SidebarMenuSubButton>
//                 </SidebarMenuSubItem>
//               );
//             })}
//           </SidebarMenuSub>
//         </CollapsibleContent>
//       </SidebarMenuItem>
//     </Collapsible>
//   );
// }


// another new code --------------------------------------------
// "use client";

// import * as React from "react";
// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import { ChevronRight } from "lucide-react";

// import {
//   Collapsible,
//   CollapsibleContent,
//   CollapsibleTrigger,
// } from "@/components/ui/collapsible";

// import {
//   SidebarMenuButton,
//   SidebarMenuItem,
//   SidebarMenuSub,
//   SidebarMenuSubButton,
//   SidebarMenuSubItem,
// } from "@/components/ui/sidebar";

// import type { SidebarItem } from "@/types/sidebar-navigation";
// import { sidebarIcons } from "@/lib/sidebar-icons";

// interface AppSidebarItemProps {
//   item: SidebarItem;
//   openMenu: string | null;
//   onParentToggle: (title: string) => void;
// }

// export default function AppSidebarItem({
//   item,
//   openMenu,
//   onParentToggle,
// }: AppSidebarItemProps) {
//   const pathname = usePathname();

//   const Icon = sidebarIcons[item.icon];

//   const isActive =
//     item.href === pathname ||
//     (!!item.href && pathname.startsWith(`${item.href}/`));

//   const isParentActive =
//     item.children?.some((child) => {
//       if (!child.href) return false;

//       return (
//         pathname === child.href ||
//         pathname.startsWith(`${child.href}/`)
//       );
//     }) ?? false;

//   const isOpen = openMenu === item.title;

//   /*
//    * ==========================================
//    * SIMPLE MENU ITEM
//    * ==========================================
//    */

//   if (!item.children?.length) {
//     return (
//       <SidebarMenuItem>
//         <SidebarMenuButton
//           render={<Link href={item.href ?? "#"} />}
//           isActive={isActive}
//           tooltip={item.title}
//           className="
//             h-11
//             w-full
//             rounded-xl
//             px-3

//             font-medium
//             text-sm

//             transition-all
//             duration-200

//             hover:bg-primary/10
//             hover:text-primary

//             data-[active=true]:bg-primary
//             data-[active=true]:text-primary-foreground
//             data-[active=true]:shadow-sm

//             /* ==========================
//                COLLAPSED SIDEBAR
//                ========================== */

//             group-data-[collapsible=icon]:!mx-auto
//             group-data-[collapsible=icon]:!flex
//             group-data-[collapsible=icon]:!h-11
//             group-data-[collapsible=icon]:!w-11
//             group-data-[collapsible=icon]:!min-w-11
//             group-data-[collapsible=icon]:!max-w-11
//             group-data-[collapsible=icon]:!justify-center
//             group-data-[collapsible=icon]:!px-0
//             group-data-[collapsible=icon]:!rounded-xl
//           "
//         >
//           <Icon
//             className="
//               size-[19px]
//               shrink-0

//               transition-all
//               duration-200

//               group-data-[collapsible=icon]:!size-[22px]
//             "
//           />

//           <span className="truncate">
//             {item.title}
//           </span>
//         </SidebarMenuButton>
//       </SidebarMenuItem>
//     );
//   }

//   /*
//    * ==========================================
//    * PARENT MENU
//    * ==========================================
//    */

//   return (
//     <Collapsible
//       open={isOpen}
//       onOpenChange={() => onParentToggle(item.title)}
//       className="group/collapsible"
//     >
//       <SidebarMenuItem>
//         <CollapsibleTrigger
//           render={
//             <SidebarMenuButton
//               tooltip={item.title}
//               isActive={isParentActive}
//               className="
//                 h-11
//                 w-full
//                 rounded-xl
//                 px-3

//                 font-medium
//                 text-sm

//                 transition-all
//                 duration-200

//                 hover:bg-primary/10
//                 hover:text-primary

//                 data-[active=true]:bg-primary
//                 data-[active=true]:text-primary-foreground
//                 data-[active=true]:shadow-sm

//                 /* ==========================
//                    COLLAPSED SIDEBAR
//                    ========================== */

//                 group-data-[collapsible=icon]:!mx-auto
//                 group-data-[collapsible=icon]:!flex
//                 group-data-[collapsible=icon]:!h-11
//                 group-data-[collapsible=icon]:!w-11
//                 group-data-[collapsible=icon]:!min-w-11
//                 group-data-[collapsible=icon]:!max-w-11
//                 group-data-[collapsible=icon]:!justify-center
//                 group-data-[collapsible=icon]:!px-0
//                 group-data-[collapsible=icon]:!rounded-xl
//               "
//             />
//           }
//         >
//           <Icon
//             className="
//               size-[19px]
//               shrink-0

//               transition-all
//               duration-200

//               group-data-[collapsible=icon]:!size-[22px]
//             "
//           />

//           <span className="truncate">
//             {item.title}
//           </span>

//           <ChevronRight
//             className="
//               ml-auto
//               size-4
//               shrink-0

//               transition-transform
//               duration-200

//               group-data-[state=open]/collapsible:rotate-90

//               group-data-[collapsible=icon]:hidden
//             "
//           />
//         </CollapsibleTrigger>

//         <CollapsibleContent>
//           <SidebarMenuSub
//             className="
//               ml-3
//               mt-1
//               border-l
//               border-primary/15
//               py-1
//               pl-3
//             "
//           >
//             {item.children.map((child) => {
//               const ChildIcon = sidebarIcons[child.icon];

//               const childHref = child.href ?? "#";

//               const childIsActive =
//                 child.href === pathname ||
//                 (!!child.href &&
//                   pathname.startsWith(`${child.href}/`));

//               return (
//                 <SidebarMenuSubItem key={child.title}>
//                   <SidebarMenuSubButton
//                     render={<Link href={childHref} />}
//                     isActive={childIsActive}
//                     className="
//                       h-10
//                       w-full
//                       rounded-lg
//                       px-3

//                       text-sm
//                       font-medium
//                       text-muted-foreground

//                       transition-all
//                       duration-200

//                       hover:bg-primary/10
//                       hover:text-primary

//                       data-[active=true]:bg-primary/10
//                       data-[active=true]:text-primary
//                       data-[active=true]:font-semibold
//                     "
//                   >
//                     <ChildIcon className="size-[17px] shrink-0" />

//                     <span className="truncate">
//                       {child.title}
//                     </span>
//                   </SidebarMenuSubButton>
//                 </SidebarMenuSubItem>
//               );
//             })}
//           </SidebarMenuSub>
//         </CollapsibleContent>
//       </SidebarMenuItem>
//     </Collapsible>
//   );
// }



// ---------------------aur naya code ----------------------- 



"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";

import type { SidebarItem } from "@/types/sidebar-navigation";
import { sidebarIcons } from "@/lib/sidebar-icons";

interface AppSidebarItemProps {
  item: SidebarItem;
  isOpen: boolean;
  onToggle: () => void;
}

export default function AppSidebarItem({
  item,
  isOpen,
  onToggle,
}: AppSidebarItemProps) {
  const pathname = usePathname();

  const { open, setOpen, isMobile, setOpenMobile } = useSidebar();

  const Icon = sidebarIcons[item.icon];

  /*
   * Direct route active
   */
  const isActive =
    !!item.href &&
    (pathname === item.href ||
      pathname.startsWith(`${item.href}/`));

  /*
   * Child route active
   */
  const isParentActive =
    item.children?.some((child) => {
      if (!child.href) return false;

      return (
        pathname === child.href ||
        pathname.startsWith(`${child.href}/`)
      );
    }) ?? false;

  /*
   * Parent remains visually active
   * when one of its children is active.
   */
  const parentIsActive =
    isActive || isParentActive;


  // Keep the submenu for the current route visible without synchronously
  // mutating parent state from an effect. The previous pair of effects could
  // toggle each other forever while the desktop sidebar was collapsed.
  const submenuIsOpen = isOpen || isParentActive;

  /*
   * ================================
   * SIMPLE MENU
   * ================================
   */
  if (!item.children?.length) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          render={
            <Link href={item.href ?? "#"} 
              
            />
          }
          isActive={parentIsActive}
          tooltip={item.title}
          className="h-11 rounded-xl px-3 text-sidebar-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-sm group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:size-11 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:[&>svg]:mx-auto"
        >
          <Icon
            className="size-5 shrink-0 transition-transform duration-200 group-data-[collapsible=icon]:size-4"
          />

          <span className="truncate">
            {item.title}
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  /*
   * ================================
   * PARENT MENU WITH SUBMENU
   * ================================
   */
  const handleParentClick = () => {
    /*
     * Mobile sidebar
     */
    if (isMobile) {
      onToggle();
      return;
    }

    /*
     * Collapsed desktop sidebar:
     *
     * 1. Open sidebar
     * 2. Open clicked submenu
     */
    if (!open) {
      setOpen(true);
      if (!submenuIsOpen) {
        onToggle();
      }
      return;
    }

    /*
     * Expanded sidebar:
     * Toggle current parent.
     *
     * NavMain handles closing
     * another opened parent.
     */
    onToggle();
  };

  return (
    <Collapsible
      open={submenuIsOpen}
      onOpenChange={() => {
        handleParentClick();
      }}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger
          render={
            <SidebarMenuButton
              tooltip={item.title}
              isActive={parentIsActive}
              className="h-11 rounded-xl px-3 text-sidebar-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-sm group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:size-11 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:[&>svg]:mx-auto"
            />
          }
        >
          <Icon
            className="size-5 shrink-0 transition-transform duration-200 group-data-[collapsible=icon]:size-4"
          />

          <span className="truncate">
            {item.title}
          </span>

          <ChevronRight
  className={`ml-auto size-4 shrink-0 transition-transform duration-200 ${submenuIsOpen ? "rotate-90" : "rotate-0"} group-data-[collapsible=icon]:hidden`}
/>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <SidebarMenuSub className="ml-3 border-l border-border/60 pl-3">
            {item.children.map((child) => {
              const ChildIcon =
                sidebarIcons[child.icon];

              const childIsActive =
                !!child.href &&
                (pathname === child.href ||
                  pathname.startsWith(
                    `${child.href}/`
                  ));

              return (
                <SidebarMenuSubItem
                  key={child.title}
                >
                  <SidebarMenuSubButton
                    render={
                      <Link
                        href={child.href ?? "#"}/>
                    }
                    isActive={childIsActive}
                    className="h-10 rounded-lg text-sidebar-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-medium"
                  onClick={() => {
        if (isMobile) {
          setOpenMobile(false);
        }
      }}
                  >
                    <ChildIcon className="size-4 shrink-0" />

                    <span className="truncate">
                      {child.title}
                    </span>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
