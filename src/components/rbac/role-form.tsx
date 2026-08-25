"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { saveRole } from "@/lib/rbac/admin";
import { getNetworkErrorMessage } from "@/lib/client/network-error";

type Role = { id: string; name: string; slug: string; description: string | null };
type Permission = { id: string; module: string; action: string; permission_key: string; description: string | null };

export function RoleForm({
  role,
  permissions,
  initialPermissionIds = [],
}: {
  role?: Role;
  permissions: Permission[];
  initialPermissionIds?: string[];
}) {
  const router = useRouter();
  const isSuperAdmin = role?.slug === "super_admin";
  const [name, setName] = React.useState(role?.name ?? "");
  const [slug, setSlug] = React.useState(role?.slug ?? "");
  const [description, setDescription] = React.useState(role?.description ?? "");
  const [permissionIds, setPermissionIds] = React.useState<string[]>(
    isSuperAdmin ? permissions.map((permission) => permission.id) : initialPermissionIds,
  );
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const groups = React.useMemo(() => {
    const grouped = new Map<string, Permission[]>();
    for (const permission of permissions) {
      const moduleKey = permission.module.trim().toLowerCase();
      grouped.set(moduleKey, [...(grouped.get(moduleKey) ?? []), permission]);
    }
    return Array.from(grouped.entries());
  }, [permissions]);

  function togglePermission(id: string, checked: boolean) {
    setPermissionIds((current) =>
      checked ? Array.from(new Set([...current, id])) : current.filter((permissionId) => permissionId !== id),
    );
  }

  function toggleModule(modulePermissions: Permission[], checked: boolean) {
    const ids = new Set(modulePermissions.map((permission) => permission.id));
    setPermissionIds((current) =>
      checked
        ? Array.from(new Set([...current, ...ids]))
        : current.filter((id) => !ids.has(id)),
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await saveRole(role?.id ?? null, {
        name,
        slug,
        description: description || null,
        permission_ids: isSuperAdmin ? permissions.map((permission) => permission.id) : permissionIds,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push("/home/roles");
      router.refresh();
    } catch (caught) {
      setError(getNetworkErrorMessage(caught, "Could not save the role."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium">Role name<input required minLength={2} value={name} onChange={(event) => { const value = event.target.value; setName(value); if (!role) setSlug(value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); }} className="h-10 w-full rounded-lg border bg-background px-3" /></label>
        <label className="space-y-2 text-sm font-medium">Slug<input required disabled={isSuperAdmin} value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))} className="h-10 w-full rounded-lg border bg-background px-3 disabled:bg-muted" /></label>
        <label className="space-y-2 text-sm font-medium sm:col-span-2">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-24 w-full rounded-lg border bg-background p-3" /></label>
      </div>

      <section className="space-y-4 border-t pt-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-semibold">Role Permissions</h2><p className="text-sm text-muted-foreground">Users inherit every checked permission from this role.</p></div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{isSuperAdmin ? permissions.length : permissionIds.length} of {permissions.length} selected</span>
        </div>
        {isSuperAdmin && <p className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">Super Admin always receives every available permission. These selections cannot be removed.</p>}
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map(([module, modulePermissions]) => {
            const selectedCount = modulePermissions.filter((permission) => isSuperAdmin || permissionIds.includes(permission.id)).length;
            const allSelected = selectedCount === modulePermissions.length;
            return (
              <div key={module} className="rounded-xl border p-4">
                <div className="mb-3 flex items-center justify-between border-b pb-3">
                  <div><h3 className="font-semibold capitalize">{module.replaceAll("_", " ")}</h3><p className="text-xs text-muted-foreground">{selectedCount}/{modulePermissions.length} enabled</p></div>
                  <label className="flex items-center gap-2 text-xs font-medium"><input type="checkbox" checked={allSelected} disabled={isSuperAdmin} onChange={(event) => toggleModule(modulePermissions, event.target.checked)} />Select all</label>
                </div>
                <div className="space-y-2">
                  {modulePermissions.map((permission) => (
                    <label key={permission.id} className="flex items-start gap-3 rounded-lg p-2 transition hover:bg-muted/50">
                      <input type="checkbox" className="mt-1" checked={isSuperAdmin || permissionIds.includes(permission.id)} disabled={isSuperAdmin} onChange={(event) => togglePermission(permission.id, event.target.checked)} />
                      <span><span className="block text-sm font-medium capitalize">{permission.action.trim().toLowerCase().replaceAll("_", " ")}</span><span className="block text-xs text-muted-foreground">{permission.permission_key}</span></span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-3 border-t pt-5"><Button type="button" variant="outline" onClick={() => router.push("/home/roles")}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : role ? "Save Role" : "Create Role"}</Button></div>
    </form>
  );
}
