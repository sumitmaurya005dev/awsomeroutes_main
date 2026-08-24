/**
 * Auth Module Barrel File
 *
 * This file acts as a central export point for all authentication
 * and authorization related utilities.
 *
 * Instead of importing functions from individual files,
 * we can import everything from "@/lib/auth".
 *
 * Example:
 * import { getCurrentUser, can, requirePermission } from "@/lib/auth";
 *
 * Exports:
 * - getCurrentUser       → Returns currently authenticated user with role details
 * - getUserPermissions   → Returns permissions assigned to user's role
 * - requirePermission    → Enforces a permission on the server
 * - can                  → Checks whether user has a specific permission
 */

export { getCurrentUser } from "./get-current-user";
export { getUserPermissions } from "./get-user-permission";
export { can } from "./can";
export { filterSidebar } from "./fiter-sidebar";
export { hasPermission, requirePermission } from "./require-permission";
