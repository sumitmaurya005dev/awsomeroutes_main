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
 * import { getCurrentUser, can, hasRole } from "@/lib/auth";
 *
 * Exports:
 * - getCurrentUser       → Returns currently authenticated user with role details
 * - getUserPermissions   → Returns permissions assigned to user's role
 * - hasRole              → Checks whether user has a specific role
 * - can                  → Checks whether user has a specific permission
 */

import { filterSidebar } from "./fiter-sidebar";

export { getCurrentUser } from "./get-current-user";
export { getUserPermissions } from "./get-user-permission";
export { hasRole } from "./has-role";
export { can } from "./can";
export {filterSidebar} from "./fiter-sidebar"