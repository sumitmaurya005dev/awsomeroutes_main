import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "./get-current-user";


type RolePermissionWithPermission = {
  permissions: {
    id: string;
    permission_key: string;
  };
};


export async function getUserPermissions() {
  const supabase = await createClient();

  // Get current logged-in user
  const currentUser = await getCurrentUser();

  if (!currentUser?.roleId) {
    return [];
  }


  // Get all permissions assigned to user's role
  const { data, error } = await supabase
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


  return permissions.map(
    (item) => item.permissions.permission_key
  );
}