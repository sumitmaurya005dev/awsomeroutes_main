import { getUserPermissions } from "./get-user-permission";


export async function can(permission: string): Promise<boolean> {

  const permissions = await getUserPermissions();


  return permissions.includes(permission);

}