import type { IconName } from "@/lib/sidebar-icons";

export interface SidebarItem {
  title: string;

  href?: string;

  icon: IconName;

  permission?: string;

  children?: SidebarItem[];
}