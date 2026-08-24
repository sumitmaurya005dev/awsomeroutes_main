import { getUserPermissions } from "./get-user-permission";
import type { PermissionKey } from "@/config/permissions";


export async function can(permission: PermissionKey): Promise<boolean> {

  const permissions = await getUserPermissions();


  return permissions.includes(permission);

}
