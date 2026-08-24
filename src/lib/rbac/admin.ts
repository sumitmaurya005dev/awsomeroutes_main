"use server";

import { z } from "zod";
import { getCurrentUser, getUserPermissions, requirePermission } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const userSchema = z.object({ first_name: z.string().trim().min(1).max(100), last_name: z.string().trim().max(100).optional().nullable(), email: z.string().trim().email(), password: z.string().min(8).max(128), phone: z.string().trim().max(30).optional().nullable(), role_id: z.string().uuid(), status: z.enum(["active", "inactive"]) });
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

export async function getUsersData() {
  await requirePermission("users.view"); const admin = createAdminClient();
  const [profiles, roles, authUsers, assignable] = await Promise.all([
    admin.from("profiles").select("id,first_name,last_name,avatar_url,phone,status,role_id,created_at,role:roles(id,name,slug)").order("created_at", { ascending: false }),
    admin.from("roles").select("*").order("name"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    getAssignableRoleIds(),
  ]);
  for (const result of [profiles, roles]) if (result.error) throw new Error(result.error.message);
  if (authUsers.error) throw new Error(authUsers.error.message);
  const emailById = new Map(authUsers.data.users.map((user) => [user.id, user.email ?? null]));
  return {
    profiles: (profiles.data ?? []).map((profile) => ({ ...profile, email: emailById.get(profile.id) ?? null })),
    roles: (roles.data ?? []).filter((role) => assignable.allowedByRole.get(role.id) ?? true),
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
  const { error: profileError } = await admin.from("profiles").upsert({ id: data.user.id, first_name: parsed.data.first_name, last_name: parsed.data.last_name || null, phone: parsed.data.phone || null, role_id: parsed.data.role_id, status: parsed.data.status });
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
  const payload = { name: parsed.data.name, slug: parsed.data.slug, description: parsed.data.description || null }; const result = id ? await admin.from("roles").update(payload).eq("id", id).select("id").single() : await admin.from("roles").insert(payload).select("id").single();
  if (result.error || !result.data) return { success: false as const, error: result.error?.message ?? "Failed to save role." }; const roleId = result.data.id;
  const previousMappings = id
    ? await admin.from("role_permissions").select("permission_id").eq("role_id", roleId)
    : { data: [], error: null };
  if (previousMappings.error) return { success: false as const, error: previousMappings.error.message };
  const { error: clearError } = await admin.from("role_permissions").delete().eq("role_id", roleId); if (clearError) return { success: false as const, error: clearError.message };
  if (permissionIds.length) {
    const { error } = await admin.from("role_permissions").insert(permissionIds.map((permission_id) => ({ role_id: roleId, permission_id })));
    if (error) {
      if (id && previousMappings.data?.length) {
        await admin.from("role_permissions").insert(previousMappings.data.map((mapping) => ({ role_id: roleId, permission_id: mapping.permission_id })));
      } else if (!id) {
        await admin.from("roles").delete().eq("id", roleId);
      }
      return { success: false as const, error: error.message };
    }
  }
  return { success: true as const };
}

export async function savePermission(id: string | null, input: z.infer<typeof permissionSchema>) {
  await requirePermission(id ? "permissions.update" : "permissions.create");
  const parsed = permissionSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Invalid permission data." };
  const admin = createAdminClient();
  const payload = { ...parsed.data, description: parsed.data.description || null };
  if (id) {
    const existing = await admin
      .from("permissions")
      .select("module,action,permission_key")
      .eq("id", id)
      .maybeSingle();
    if (existing.error || !existing.data) {
      return { success: false as const, error: existing.error?.message ?? "Permission was not found." };
    }
    if (
      existing.data.module !== parsed.data.module ||
      existing.data.action !== parsed.data.action ||
      existing.data.permission_key !== parsed.data.permission_key
    ) {
      return {
        success: false as const,
        error: "Permission module, action, and key are immutable. Create a new permission instead.",
      };
    }
    const { error } = await admin
      .from("permissions")
      .update({ description: payload.description })
      .eq("id", id);
    return error ? { success: false as const, error: error.message } : { success: true as const };
  }
  const created = await admin.from("permissions").insert(payload).select("id").single();
  if (created.error || !created.data) return { success: false as const, error: created.error?.message ?? "Failed to create permission." };
  const superAdmin = await admin.from("roles").select("id").eq("slug", "super_admin").maybeSingle();
  if (superAdmin.error || !superAdmin.data) {
    await admin.from("permissions").delete().eq("id", created.data.id);
    return { success: false as const, error: superAdmin.error?.message ?? "Super Admin role was not found." };
  }
  const mapping = await admin.from("role_permissions").insert({ role_id: superAdmin.data.id, permission_id: created.data.id });
  if (mapping.error) {
    await admin.from("permissions").delete().eq("id", created.data.id);
    return { success: false as const, error: mapping.error.message };
  }
  return { success: true as const };
}
