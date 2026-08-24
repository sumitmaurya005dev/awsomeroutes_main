"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { DataPagination } from "@/components/common/data-pagination";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateManagedUser } from "@/lib/rbac/admin";

type Role = { id: string; name: string; slug: string };

type User = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  role_id: string | null;
  created_at: string | null;
  role: Role | null;
};

type EditForm = {
  first_name: string;
  last_name: string;
  phone: string;
  role_id: string;
  status: "active" | "inactive";
};

export function UsersManagementTable({
  users,
  roles,
  canUpdate,
  canEditIdentity,
}: {
  users: User[];
  roles: Role[];
  canUpdate: boolean;
  canEditIdentity: boolean;
}) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [sort, setSort] = React.useState("name:asc");
  const [page, setPage] = React.useState(1);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const [avatar, setAvatar] = React.useState<File | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<EditForm>({
    first_name: "",
    last_name: "",
    phone: "",
    role_id: "",
    status: "active",
  });

  const limit = 50;
  const rows = users
    .filter(
      (user) =>
        `${user.first_name ?? ""} ${user.last_name ?? ""} ${user.email ?? ""} ${user.role?.name ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase()) &&
        (status === "all" || user.status === status),
    )
    .sort((a, b) => {
      const left = `${a.first_name ?? ""} ${a.last_name ?? ""}`;
      const right = `${b.first_name ?? ""} ${b.last_name ?? ""}`;
      return sort === "name:desc"
        ? right.localeCompare(left)
        : left.localeCompare(right);
    });
  const totalPages = Math.max(1, Math.ceil(rows.length / limit));
  const visible = rows.slice((page - 1) * limit, page * limit);

  function openEditor(user: User) {
    setSelectedUser(user);
    setAvatar(null);
    setError(null);
    setForm({
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      phone: user.phone ?? "",
      role_id: user.role_id ?? roles[0]?.id ?? "",
      status: user.status === "inactive" ? "inactive" : "active",
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedUser) return;
    setSaving(true);
    setError(null);

    const result = await updateManagedUser(selectedUser.id, {
      first_name: form.first_name,
      last_name: form.last_name || null,
      phone: form.phone || null,
      role_id: form.role_id,
      status: form.status,
    });

    if (!result.success) {
      setSaving(false);
      setError(result.error);
      return;
    }

    if (avatar) {
      const body = new FormData();
      body.append("file", avatar);
      body.append("userId", selectedUser.id);
      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body,
      });
      if (!response.ok) {
        const responseBody = await response.text();
        let message = "Profile photo upload failed.";
        if (responseBody) {
          try {
            message = (JSON.parse(responseBody) as { error?: string }).error ?? message;
          } catch {}
        }
        setSaving(false);
        setError(`User details were updated, but ${message}`);
        return;
      }
    }

    setSaving(false);
    setSelectedUser(null);
    router.refresh();
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-semibold">All Users</h2>
          <p className="text-sm text-muted-foreground">View and manage all portal users in the system.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search users..." className="h-10 rounded-lg border bg-background px-3 text-sm" />
          <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} className="h-10 rounded-lg border bg-background px-3 text-sm">
            <option value="name:asc">Name: A → Z</option>
            <option value="name:desc">Name: Z → A</option>
          </select>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-10 rounded-lg border bg-background px-3 text-sm">
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="border-b bg-muted/40"><tr><th className="px-5 py-4 text-left">User</th><th className="px-5 py-4 text-left">Role</th><th className="px-5 py-4 text-left">Status</th><th className="px-5 py-4 text-left">Created</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
            <tbody className="divide-y">
              {visible.length ? visible.map((user) => {
                const initials = `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() || "U";
                return (
                  <tr key={user.id}>
                    <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center overflow-hidden rounded-lg bg-primary/10 text-xs font-bold text-primary">{user.avatar_url ? <Image src={user.avatar_url} alt="" width={40} height={40} unoptimized className="h-full w-full object-cover" /> : initials}</div><div><p className="font-medium">{user.first_name} {user.last_name}</p><p className="text-xs text-muted-foreground">{user.email}</p></div></div></td>
                    <td className="px-5 py-4">{user.role?.name ?? "No role"}</td>
                    <td className="px-5 py-4"><span className="rounded-full bg-muted px-2.5 py-1 text-xs capitalize">{user.status ?? "active"}</span></td>
                    <td className="px-5 py-4 text-muted-foreground">{user.created_at ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(user.created_at)) : "—"}</td>
                    <td className="px-5 py-4 text-right">{canUpdate && <button type="button" onClick={() => openEditor(user)} className="rounded-md border px-3 py-1.5 text-xs transition hover:bg-muted">Edit</button>}</td>
                  </tr>
                );
              }) : <tr><td colSpan={5} className="px-5 py-16 text-center text-muted-foreground">No users found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <DataPagination page={page} totalPages={totalPages} count={rows.length} limit={limit} />

      <Dialog open={Boolean(selectedUser)} onOpenChange={(open) => { if (!open && !saving) setSelectedUser(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update profile details, account status, photo, and inherited role.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">First name<input required disabled={!canEditIdentity} value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} className="h-10 w-full rounded-lg border bg-background px-3 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground" /></label>
              <label className="space-y-2 text-sm font-medium">Last name<input disabled={!canEditIdentity} value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} className="h-10 w-full rounded-lg border bg-background px-3 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground" /></label>
              {!canEditIdentity && <p className="text-xs font-normal text-muted-foreground sm:col-span-2">Only a Super Admin can change a user&apos;s first or last name.</p>}
              <label className="space-y-2 text-sm font-medium">Email<input disabled value={selectedUser?.email ?? ""} className="h-10 w-full rounded-lg border bg-muted px-3 text-muted-foreground" /></label>
              <label className="space-y-2 text-sm font-medium">Phone<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="h-10 w-full rounded-lg border bg-background px-3" /></label>
              <label className="space-y-2 text-sm font-medium">Role<select required value={form.role_id} onChange={(event) => setForm({ ...form, role_id: event.target.value })} className="h-10 w-full rounded-lg border bg-background px-3">{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
              <label className="space-y-2 text-sm font-medium">Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as "active" | "inactive" })} className="h-10 w-full rounded-lg border bg-background px-3"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
              <label className="space-y-2 text-sm font-medium sm:col-span-2">New profile photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setAvatar(event.target.files?.[0] ?? null)} className="block w-full rounded-lg border bg-background px-3 py-2 text-sm" /><span className="block text-xs font-normal text-muted-foreground">Optional. Uploading a new photo replaces the current avatar.</span></label>
            </div>
            {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
            <DialogFooter className="mx-0 mb-0 px-0 pb-0">
              <Button type="button" variant="outline" onClick={() => setSelectedUser(null)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving || roles.length === 0}>{saving ? "Saving..." : "Save User"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
