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
    (pathname === item.href || pathname.startsWith(`${item.href}/`));

  /*
   * Child route active
   */
  const isParentActive =
    item.children?.some((child) => {
      if (!child.href) return false;

      return pathname === child.href || pathname.startsWith(`${child.href}/`);
    }) ?? false;

  /*
   * Parent remains visually active
   * when one of its children is active.
   */
  const parentIsActive = isActive || isParentActive;

  // NavMain owns the single open parent so this behaves like an accordion.
  // Route activity is used only for visual highlighting here.
  const submenuIsOpen = isOpen;

  /*
   * ================================
   * SIMPLE MENU
   * ================================
   */
  if (!item.children?.length) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          render={<Link href={item.href ?? "#"} />}
          isActive={parentIsActive}
          tooltip={item.title}
          className="h-11 rounded-xl px-3 text-sidebar-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:shadow-sm group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:size-11 group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:[&>svg]:mx-auto"
        >
          <Icon className="size-5 shrink-0 transition-transform duration-200 group-data-[collapsible=icon]:size-4" />

          <span className="truncate">{item.title}</span>
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
          <Icon className="size-5 shrink-0 transition-transform duration-200 group-data-[collapsible=icon]:size-4" />

          <span className="truncate">{item.title}</span>

          <ChevronRight
            className={`ml-auto size-4 shrink-0 transition-transform duration-200 ${submenuIsOpen ? "rotate-90" : "rotate-0"} group-data-[collapsible=icon]:hidden`}
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <SidebarMenuSub className="ml-3 border-l border-border/60 pl-3">
            {item.children.map((child) => {
              const ChildIcon = sidebarIcons[child.icon];

              const childIsActive =
                !!child.href &&
                (pathname === child.href ||
                  pathname.startsWith(`${child.href}/`));

              return (
                <SidebarMenuSubItem key={child.title}>
                  <SidebarMenuSubButton
                    render={<Link href={child.href ?? "#"} />}
                    isActive={childIsActive}
                    className="h-10 rounded-lg text-sidebar-foreground transition-all duration-200 hover:bg-primary/10 hover:text-primary data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:font-medium"
                    onClick={() => {
                      if (isMobile) {
                        setOpenMobile(false);
                      }
                    }}
                  >
                    <ChildIcon className="size-4 shrink-0" />

                    <span className="truncate">{child.title}</span>
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
