import { getCurrentUser } from "./get-current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PermissionKey } from "@/config/permissions";


type RolePermissionWithPermission = {
  permissions: {
    id: string;
    permission_key: string;
  };
};


export async function getUserPermissions(): Promise<PermissionKey[]> {
  const currentUser = await getCurrentUser();

  if (!currentUser?.roleId) {
    return [];
  }


  // Get all permissions assigned to user's role
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("role_permissions")
    .select(`
      permissions (
        id,
        permission_key
      )
    `)
    .eq("role_id", currentUser.roleId);


  if (error || !data) {
    console.error("Error fetching permissions:", error);
    return [];
  }


  const permissions =
    data as unknown as RolePermissionWithPermission[];


  return permissions
    .map((item) => item.permissions?.permission_key)
    .filter((key): key is PermissionKey => Boolean(key));
}
