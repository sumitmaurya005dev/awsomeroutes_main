import type { IconName } from "@/lib/sidebar-icons";
import type { PermissionKey } from "@/config/permissions";

export interface SidebarItem {
  title: string;

  href?: string;

  icon: IconName;

  permission?: PermissionKey;

  children?: SidebarItem[];
}
