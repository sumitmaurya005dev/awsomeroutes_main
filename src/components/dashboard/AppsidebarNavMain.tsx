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
          <SidebarGroup key={group.label}>

            <SidebarGroupLabel>
              {group.label}
            </SidebarGroupLabel>

            <SidebarGroupContent>

              <SidebarMenu>

                {groupItems.map((item) => (
                  <AppSidebarItem
                    key={item.title}
                    item={item}
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