"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { savePermission } from "@/lib/rbac/admin";
import { getNetworkErrorMessage } from "@/lib/client/network-error";

type Permission = { id: string; module: string; action: string; permission_key: string; description: string | null };

export function PermissionForm({ permission }: { permission?: Permission }) {
  const router = useRouter();
  const editing = Boolean(permission);
  const [module, setModule] = React.useState(permission?.module ?? "");
  const [action, setAction] = React.useState(permission?.action ?? "");
  const [description, setDescription] = React.useState(permission?.description ?? "");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const permissionKey = `${module}.${action}`;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await savePermission(permission?.id ?? null, {
        module,
        action,
        permission_key: permission?.permission_key ?? permissionKey,
        description: description || null,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push("/home/permissions");
      router.refresh();
    } catch (caught) {
      setError(getNetworkErrorMessage(caught, "Could not save the permission."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      {editing && <p className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">Permission identifiers are immutable because roles already reference them. You can safely update the description.</p>}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium">Module<input required disabled={editing} value={module} onChange={(event) => setModule(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="countries" className="h-10 w-full rounded-lg border bg-background px-3 disabled:bg-muted" /></label>
        <label className="space-y-2 text-sm font-medium">Action<input required disabled={editing} value={action} onChange={(event) => setAction(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="view" className="h-10 w-full rounded-lg border bg-background px-3 disabled:bg-muted" /></label>
        <label className="space-y-2 text-sm font-medium sm:col-span-2">Permission key<input disabled value={permission?.permission_key ?? permissionKey} className="h-10 w-full rounded-lg border bg-muted px-3 font-mono text-sm" /></label>
        <label className="space-y-2 text-sm font-medium sm:col-span-2">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Explain what this permission allows." className="min-h-28 w-full rounded-lg border bg-background p-3" /></label>
      </div>
      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-3 border-t pt-5"><Button type="button" variant="outline" onClick={() => router.push("/home/permissions")}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Save Permission" : "Create Permission"}</Button></div>
    </form>
  );
}
