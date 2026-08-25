"use server";

import { z } from "zod";
import { getCurrentUser, getUserPermissions, requirePermission } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const userSchema = z.object({ first_name: z.string().trim().min(1).max(100), last_name: z.string().trim().max(100).optional().nullable(), email: z.string().trim().email(), password: z.string().min(12).max(128).regex(/[A-Za-z]/, "Password must contain a letter.").regex(/[0-9]/, "Password must contain a number."), phone: z.string().trim().max(30).optional().nullable(), role_id: z.string().uuid(), status: z.enum(["active", "inactive"]) });
const profileSchema = userSchema.omit({ email: true, password: true });
const roleSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(
      /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/,
      "Slug may contain lowercase letters, numbers, hyphens, and underscores.",
    ),
  description: z.string().trim().max(500).nullable().optional(),
  permission_ids: z.array(z.string().uuid()).max(200),
});
const permissionSchema = z.object({ module: z.string().trim().min(2).max(100).regex(/^[a-z0-9_]+$/), action: z.string().trim().min(2).max(100).regex(/^[a-z0-9_]+$/), permission_key: z.string().trim().min(3).max(150).regex(/^[a-z0-9_]+\.[a-z0-9_]+$/), description: z.string().trim().max(500).nullable().optional() }).superRefine((value, context) => {
  if (value.permission_key !== `${value.module}.${value.action}`) context.addIssue({ code: "custom", path: ["permission_key"], message: "Permission key must match module.action." });
});

type RolePermissionKeyRow = { role_id: string; permission: { permission_key: string } | null };

async function getAssignableRoleIds() {
  const [callerPermissions, admin] = await Promise.all([getUserPermissions(), Promise.resolve(createAdminClient())]);
  const result = await admin.from("role_permissions").select("role_id,permission:permissions(permission_key)");
  if (result.error) throw new Error(result.error.message);
  const permissionSet = new Set<string>(callerPermissions);
  const allowedByRole = new Map<string, boolean>();
  for (const row of (result.data ?? []) as unknown as RolePermissionKeyRow[]) {
    const allowed = !row.permission || permissionSet.has(row.permission.permission_key);
    allowedByRole.set(row.role_id, (allowedByRole.get(row.role_id) ?? true) && allowed);
  }
  return { admin, allowedByRole };
}

async function canAssignRole(roleId: string) {
  const { allowedByRole } = await getAssignableRoleIds();
  return allowedByRole.get(roleId) ?? true;
}

export async function getUsersData({
  page = 1,
  search = "",
  status = "all",
  sort = "name:asc",
}: {
  page?: number;
  search?: string;
  status?: "all" | "active" | "inactive";
  sort?: "name:asc" | "name:desc";
} = {}) {
  await requirePermission("users.view");
  const admin = createAdminClient();
  const limit = 50;
  const safePage = Math.max(1, Math.floor(page));
  const safeSearch = search.trim().replace(/[,%()]/g, " ").slice(0, 100);
  let profileQuery = admin
    .from("profiles")
    .select("id,first_name,last_name,email,avatar_url,phone,status,role_id,created_at,role:roles(id,name,slug)", { count: "exact" });
  if (safeSearch) {
    profileQuery = profileQuery.or(`first_name.ilike.%${safeSearch}%,last_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`);
  }
  if (status !== "all") profileQuery = profileQuery.eq("status", status);
  profileQuery = profileQuery
    .order("first_name", { ascending: sort !== "name:desc", nullsFirst: false })
    .range((safePage - 1) * limit, safePage * limit - 1);
  const [profiles, roles, assignable] = await Promise.all([
    profileQuery,
    admin.from("roles").select("*").order("name"),
    getAssignableRoleIds(),
  ]);
  for (const result of [profiles, roles]) if (result.error) throw new Error(result.error.message);
  return {
    profiles: profiles.data ?? [],
    roles: (roles.data ?? []).filter((role) => assignable.allowedByRole.get(role.id) ?? true),
    count: profiles.count ?? 0,
    page: safePage,
    limit,
    totalPages: Math.max(1, Math.ceil((profiles.count ?? 0) / limit)),
  };
}

export async function getAssignableRoles() {
  await requirePermission("users.create"); const { admin, allowedByRole } = await getAssignableRoleIds();
  const result = await admin.from("roles").select("id,name,slug").order("name");
  if (result.error) throw new Error(result.error.message);
  return { roles: (result.data ?? []).filter((role) => allowedByRole.get(role.id) ?? true) };
}

export async function getRolesData() {
  await requirePermission("roles.view"); const admin = createAdminClient();
  const [roles, permissions, mappings] = await Promise.all([
    admin.from("roles").select("*").order("name"),
    admin.from("permissions").select("*").order("module").order("permission_key"),
    admin.from("role_permissions").select("role_id,permission_id"),
  ]);
  for (const result of [roles, permissions, mappings]) if (result.error) throw new Error(result.error.message);
  return { roles: roles.data ?? [], permissions: permissions.data ?? [], rolePermissions: mappings.data ?? [] };
}

export async function getRoleCreationData() {
  await requirePermission("roles.create"); const admin = createAdminClient();
  const [callerPermissions, result] = await Promise.all([
    getUserPermissions(),
    admin.from("permissions").select("*").order("module").order("permission_key"),
  ]);
  if (result.error) throw new Error(result.error.message);
  const allowed = new Set<string>(callerPermissions);
  return { permissions: (result.data ?? []).filter((permission) => allowed.has(permission.permission_key)) };
}

export async function getRoleEditorData(id: string) {
  await requirePermission("roles.update");
  const admin = createAdminClient();
  const [callerPermissions, roleResult, permissionsResult, mappingsResult] = await Promise.all([
    getUserPermissions(),
    admin.from("roles").select("id,name,slug,description").eq("id", id).maybeSingle(),
    admin.from("permissions").select("*").order("module").order("permission_key"),
    admin.from("role_permissions").select("permission_id").eq("role_id", id),
  ]);
  if (roleResult.error || !roleResult.data) throw new Error(roleResult.error?.message ?? "Role was not found.");
  if (permissionsResult.error) throw new Error(permissionsResult.error.message);
  if (mappingsResult.error) throw new Error(mappingsResult.error.message);
  const allowed = new Set<string>(callerPermissions);
  return {
    role: roleResult.data,
    permissions: (permissionsResult.data ?? []).filter((permission) => allowed.has(permission.permission_key)),
    permissionIds: (mappingsResult.data ?? []).map((mapping) => mapping.permission_id),
  };
}

export async function getPermissionsData() {
  await requirePermission("permissions.view"); const admin = createAdminClient();
  const result = await admin.from("permissions").select("*").order("module").order("permission_key");
  if (result.error) throw new Error(result.error.message);
  return { permissions: result.data ?? [] };
}

export async function getPermissionEditorData(id: string) {
  await requirePermission("permissions.update");
  const admin = createAdminClient();
  const result = await admin
    .from("permissions")
    .select("id,module,action,permission_key,description")
    .eq("id", id)
    .maybeSingle();
  if (result.error || !result.data) throw new Error(result.error?.message ?? "Permission was not found.");
  return { permission: result.data };
}

export async function createManagedUser(input: z.infer<typeof userSchema>) {
  await requirePermission("users.create"); const parsed = userSchema.safeParse(input); if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid user data." }; const admin = createAdminClient();
  if (!(await canAssignRole(parsed.data.role_id))) return { success: false as const, error: "You cannot assign a role with permissions you do not have." };
  const { data: role } = await admin.from("roles").select("id").eq("id", parsed.data.role_id).maybeSingle(); if (!role) return { success: false as const, error: "Selected role does not exist." };
  const { data, error } = await admin.auth.admin.createUser({ email: parsed.data.email, password: parsed.data.password, email_confirm: true });
  if (error || !data.user) return { success: false as const, error: error?.message ?? "Failed to create Auth user." };
  const { error: profileError } = await admin.from("profiles").upsert({ id: data.user.id, email: parsed.data.email, first_name: parsed.data.first_name, last_name: parsed.data.last_name || null, phone: parsed.data.phone || null, role_id: parsed.data.role_id, status: parsed.data.status, must_change_password: true });
  if (profileError) { await admin.auth.admin.deleteUser(data.user.id); return { success: false as const, error: profileError.message }; }
  return { success: true as const, userId: data.user.id };
}

export async function updateManagedUser(id: string, input: z.infer<typeof profileSchema>) {
  await requirePermission("users.update"); const parsed = profileSchema.safeParse(input); if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid user data." }; const admin = createAdminClient();
  const currentUser = await getCurrentUser();
  if (currentUser?.id === id && (parsed.data.status !== "active" || parsed.data.role_id !== currentUser.roleId)) {
    return { success: false as const, error: "You cannot deactivate your own account or change your own role." };
  }
  if (!(await canAssignRole(parsed.data.role_id))) return { success: false as const, error: "You cannot assign a role with permissions you do not have." };
  const existingProfile = await admin
    .from("profiles")
    .select("first_name,last_name")
    .eq("id", id)
    .maybeSingle();
  if (existingProfile.error || !existingProfile.data) {
    return { success: false as const, error: existingProfile.error?.message ?? "User profile was not found." };
  }
  const identityChanged =
    existingProfile.data.first_name !== parsed.data.first_name ||
    (existingProfile.data.last_name ?? null) !== (parsed.data.last_name || null);
  if (identityChanged && currentUser?.role.slug !== "super_admin") {
    return { success: false as const, error: "Only a Super Admin can change a user's first or last name." };
  }
  const { error } = await admin.from("profiles").update({ ...parsed.data, last_name: parsed.data.last_name || null, phone: parsed.data.phone || null, updated_at: new Date().toISOString() }).eq("id", id); return error ? { success: false as const, error: error.message } : { success: true as const, userId: id };
}

export async function saveRole(id: string | null, input: z.infer<typeof roleSchema>) {
  await requirePermission(id ? "roles.update" : "roles.create"); const parsed = roleSchema.safeParse(input); if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid role data." }; const admin = createAdminClient();
  const actor = await getCurrentUser();
  if (!actor) return { success: false as const, error: "Unauthorized." };
  const existingRole = id
    ? await admin.from("roles").select("slug").eq("id", id).maybeSingle()
    : null;
  if (existingRole?.error || (id && !existingRole?.data)) {
    return { success: false as const, error: existingRole?.error?.message ?? "Role was not found." };
  }
  const isSuperAdminRole = existingRole?.data?.slug === "super_admin" || parsed.data.slug === "super_admin";
  if (existingRole?.data?.slug === "super_admin" && parsed.data.slug !== "super_admin") {
    return { success: false as const, error: "The Super Admin role slug cannot be changed." };
  }
  let permissionIds = parsed.data.permission_ids;
  if (isSuperAdminRole) {
    const allPermissions = await admin.from("permissions").select("id");
    if (allPermissions.error) return { success: false as const, error: allPermissions.error.message };
    permissionIds = (allPermissions.data ?? []).map((permission) => permission.id);
  }
  if (permissionIds.length) {
    const [callerPermissions, selectedPermissions] = await Promise.all([
      getUserPermissions(),
      admin.from("permissions").select("id,permission_key").in("id", permissionIds),
    ]);
    if (selectedPermissions.error) return { success: false as const, error: selectedPermissions.error.message };
    const callerPermissionSet = new Set<string>(callerPermissions);
    if ((selectedPermissions.data?.length ?? 0) !== permissionIds.length || selectedPermissions.data?.some((permission) => !callerPermissionSet.has(permission.permission_key))) {
      return { success: false as const, error: "You cannot grant permissions that you do not have." };
    }
  }
  // PostgreSQL accepts NULL for these RPC parameters. Supabase's generated
  // TypeScript Args currently omit SQL parameter nullability, so the casts are
  // limited to this PostgREST boundary and do not change the runtime values.
  const { error } = await admin.rpc("save_role_with_permissions", {
    p_role_id: id as string,
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_description: (parsed.data.description || null) as string,
    p_permission_ids: permissionIds,
    p_actor_id: actor.id,
  });
  return error
    ? { success: false as const, error: error.message }
    : { success: true as const };
}

export async function savePermission(id: string | null, input: z.infer<typeof permissionSchema>) {
  await requirePermission(id ? "permissions.update" : "permissions.create");
  const parsed = permissionSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid permission data." };
  const admin = createAdminClient();
  const actor = await getCurrentUser();
  if (!actor) return { success: false as const, error: "Unauthorized." };
  // See the nullable RPC parameter note in saveRole above.
  const { error } = await admin.rpc("save_permission_definition", {
    p_permission_id: id as string,
    p_module: parsed.data.module,
    p_action: parsed.data.action,
    p_permission_key: parsed.data.permission_key,
    p_description: (parsed.data.description || null) as string,
    p_actor_id: actor.id,
  });
  return error
    ? { success: false as const, error: error.message }
    : { success: true as const };
}
