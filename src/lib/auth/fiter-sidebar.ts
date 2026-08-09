import type { SidebarItem } from "@/types/sidebar-navigation";


export function filterSidebar(
  items: SidebarItem[],
  permissions: string[]
): SidebarItem[] {

  return items
    .map((item): SidebarItem | null => {

      const filteredChildren = item.children
        ? filterSidebar(item.children, permissions)
        : [];


      const hasPermission =
        !item.permission ||
        permissions.includes(item.permission);



      if (
        hasPermission ||
        filteredChildren.length > 0
      ) {

        return {
          ...item,
          children:
            filteredChildren.length > 0
              ? filteredChildren
              : undefined,
        };

      }


      return null;

    })
    .filter(
      (item): item is SidebarItem =>
        item !== null
    );

}