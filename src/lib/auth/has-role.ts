import { getCurrentUser } from "./get-current-user";


export async function hasRole(roleSlug: string): Promise<boolean> {

  const currentUser = await getCurrentUser();


  if (!currentUser?.role) {
    return false;
  }


  return currentUser.role.slug === roleSlug;
}