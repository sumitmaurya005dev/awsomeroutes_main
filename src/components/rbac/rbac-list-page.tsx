"use client";

import * as React from "react";
import Link from "next/link";
import { Eye, KeyRound, Plus, Search, Shield } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Role = { id: string; name: string; slug: string; description?: string | null };
type Permission = { id: string; module: string; action: string; permission_key: string; description: string | null };
type Mapping = { role_id: string; permission_id: string };
type Kind = "roles" | "permissions";

export function RbacListPage({
  kind,
  roles = [],
  permissions = [],
  rolePermissions = [],
  canCreate,
  canUpdate,
}: {
  kind: Kind;
  roles?: Role[];
  permissions?: Permission[];
  rolePermissions?: Mapping[];
  canCreate: boolean;
  canUpdate: boolean;
}) {
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState("name:asc");
  const [viewingRole, setViewingRole] = React.useState<Role | null>(null);
  const config = kind === "roles"
    ? { title: "Roles", singular: "Role", description: "Create roles and assign the permissions they inherit.", icon: Shield, create: "/home/roles/create" }
    : { title: "Permissions", singular: "Permission", description: "Define permissions that can be assigned to portal roles.", icon: KeyRound, create: "/home/permissions/create" };
  const Icon = config.icon;
  const rows = kind === "roles"
    ? roles.filter((item) => `${item.name} ${item.slug}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => sort === "name:desc" ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name))
    : permissions.filter((item) => `${item.permission_key} ${item.module} ${item.action}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => sort === "name:desc" ? b.permission_key.localeCompare(a.permission_key) : a.permission_key.localeCompare(b.permission_key));

  const viewingPermissions = viewingRole
    ? permissions.filter((permission) => rolePermissions.some((mapping) => mapping.role_id === viewingRole.id && mapping.permission_id === permission.id))
    : [];
  const permissionGroups = viewingPermissions.reduce<Record<string, Permission[]>>((groups, permission) => {
    const moduleKey = permission.module.trim().toLowerCase();
    (groups[moduleKey] ??= []).push(permission);
    return groups;
  }, {});

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4"><div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-6 w-6" /></div><div><div className="flex items-center gap-2"><h1 className="text-2xl font-semibold">{config.title}</h1><span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{rows.length}</span></div><p className="mt-1 text-sm text-muted-foreground">{config.description}</p></div></div>
          {canCreate && <Link href={config.create} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" />Add {config.singular}</Link>}
        </div>

        <section className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="font-semibold">All {config.title}</h2><p className="text-sm text-muted-foreground">View and manage all {config.title.toLowerCase()} in the system.</p></div><div className="grid gap-2 sm:grid-cols-2"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${config.title.toLowerCase()}...`} className="h-10 rounded-lg border bg-background pl-9 pr-3 text-sm" /></div><select value={sort} onChange={(event) => setSort(event.target.value)} className="h-10 rounded-lg border bg-background px-3 text-sm"><option value="name:asc">Name: A → Z</option><option value="name:desc">Name: Z → A</option></select></div></div>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="border-b bg-muted/40"><tr>{kind === "roles" ? <><th className="px-5 py-4 text-left">Role</th><th className="px-5 py-4 text-left">Slug</th><th className="px-5 py-4 text-left">Permissions</th><th className="px-5 py-4 text-left">Description</th></> : <><th className="px-5 py-4 text-left">Permission</th><th className="px-5 py-4 text-left">Module</th><th className="px-5 py-4 text-left">Action</th></>}<th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y">{rows.length === 0 ? <tr><td colSpan={5} className="px-5 py-16 text-center text-muted-foreground">No {config.title.toLowerCase()} found.</td></tr> : kind === "roles" ? (rows as Role[]).map((item) => { const count = rolePermissions.filter((mapping) => mapping.role_id === item.id).length; return <tr key={item.id}><td className="px-5 py-4 font-medium">{item.name}</td><td className="px-5 py-4 text-muted-foreground">{item.slug}</td><td className="px-5 py-4"><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{count} permissions</span></td><td className="max-w-sm px-5 py-4 text-muted-foreground">{item.description ?? "—"}</td><td className="px-5 py-4"><div className="flex justify-end gap-2"><button type="button" onClick={() => setViewingRole(item)} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs transition hover:bg-muted"><Eye className="h-3.5 w-3.5" />View</button>{canUpdate && <Link href={`/home/roles/${item.id}/edit`} className="rounded-md border px-3 py-1.5 text-xs transition hover:bg-muted">Edit</Link>}</div></td></tr>; }) : (rows as Permission[]).map((item) => <tr key={item.id}><td className="px-5 py-4 font-medium">{item.permission_key}</td><td className="px-5 py-4 capitalize">{item.module.replaceAll("_", " ")}</td><td className="px-5 py-4 capitalize">{item.action.replaceAll("_", " ")}</td><td className="px-5 py-4 text-right">{canUpdate && <Link href={`/home/permissions/${item.id}/edit`} className="rounded-md border px-3 py-1.5 text-xs transition hover:bg-muted">Edit</Link>}</td></tr>)}</tbody></table></div></div>
        </section>
      </div>

      <Dialog open={Boolean(viewingRole)} onOpenChange={(open) => { if (!open) setViewingRole(null); }}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>{viewingRole?.name} Permissions</DialogTitle><DialogDescription>Every user assigned to this role inherits these {viewingPermissions.length} permissions.</DialogDescription></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(permissionGroups).map(([module, items]) => <section key={module} className="rounded-xl border p-4"><h3 className="mb-3 border-b pb-2 font-semibold capitalize">{module.replaceAll("_", " ")}</h3><div className="space-y-2">{items.map((permission) => <div key={permission.id}><p className="text-sm font-medium capitalize">{permission.action.replaceAll("_", " ")}</p><p className="text-xs text-muted-foreground">{permission.permission_key}</p></div>)}</div></section>)}
            {viewingPermissions.length === 0 && <p className="col-span-full py-8 text-center text-muted-foreground">No permissions assigned to this role.</p>}
          </div>
          {viewingRole && canUpdate && <div className="flex justify-end border-t pt-4"><Link href={`/home/roles/${viewingRole.id}/edit`} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Edit Role Permissions</Link></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
