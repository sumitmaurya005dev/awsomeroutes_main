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
} from "@/components/ui/sidebar";

import type { SidebarItem } from "@/types/sidebar-navigation";
import { sidebarIcons } from "@/lib/sidebar-icons";

interface AppSidebarItemProps {
  item: SidebarItem;
}

export default function AppSidebarItem({
  item,
}: AppSidebarItemProps) {
  const pathname = usePathname();

  const isActive = item.href === pathname;

  const isParentActive =
    item.children?.some((child) =>
      pathname.startsWith(child.href ?? "")
    ) ?? false;

  const Icon = sidebarIcons[item.icon];

  // ===============================
  // Simple Menu Item
  // ===============================
  if (!item.children?.length) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          render={<Link href={item.href ?? "#"} />}
          isActive={isActive}
          tooltip={item.title}
        >
          <Icon className="h-4 w-4" />
          <span>{item.title}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  // ===============================
  // Parent Menu with Submenu
  // ===============================
  return (
    <Collapsible
      defaultOpen={isParentActive}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger
          render={
            <SidebarMenuButton tooltip={item.title} />
          }
        >
          <Icon className="h-10 w-10" />

          <span>{item.title}</span>

          <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children.map((child) => {
              const ChildIcon = sidebarIcons[child.icon];

              return (
                <SidebarMenuSubItem key={child.title}>
                  <SidebarMenuSubButton
                    render={<Link href={child.href ?? "#"} />}
                    isActive={pathname === child.href}
                  >
                    <ChildIcon className="h-4 w-4" />
                    <span>{child.title}</span>
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