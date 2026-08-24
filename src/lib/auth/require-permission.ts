import { getUserPermissions } from "./get-user-permission";
import type { PermissionKey } from "@/config/permissions";

export class AuthorizationError extends Error {
  readonly status = 403;

  constructor(permission: PermissionKey) {
    super(`Missing required permission: ${permission}`);
    this.name = "AuthorizationError";
  }
}

export async function hasPermission(permission: PermissionKey) {
  return (await getUserPermissions()).includes(permission);
}

export async function requirePermission(permission: PermissionKey) {
  if (!(await hasPermission(permission))) throw new AuthorizationError(permission);
}
