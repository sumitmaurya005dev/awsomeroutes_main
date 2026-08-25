"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createManagedUser } from "@/lib/rbac/admin";
import { getNetworkErrorMessage } from "@/lib/client/network-error";

type Role = { id: string; name: string };

export function AddUserForm({ roles }: { roles: Role[] }) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [avatar, setAvatar] = React.useState<File | null>(null);
  const [form, setForm] = React.useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    phone: "",
    role_id: roles[0]?.id ?? "",
    status: "active" as "active" | "inactive",
  });

  const input =
    "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const result = await createManagedUser({
        ...form,
        last_name: form.last_name || null,
        phone: form.phone || null,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      if (avatar && result.userId) {
        const data = new FormData();
        data.append("file", avatar);
        data.append("userId", result.userId);
        const response = await fetch("/api/profile/avatar", { method: "POST", body: data });

        if (!response.ok) {
          setError("User was created, but profile photo upload failed.");
          return;
        }
      }

      router.push("/home/users");
      router.refresh();
    } catch (caught) {
      setError(getNetworkErrorMessage(caught, "Could not create the user."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium">
          First name
          <input className={input} value={form.first_name} onChange={(event) => setForm({ ...form, first_name: event.target.value })} required />
        </label>
        <label className="space-y-2 text-sm font-medium">
          Last name
          <input className={input} value={form.last_name} onChange={(event) => setForm({ ...form, last_name: event.target.value })} />
        </label>
        <label className="space-y-2 text-sm font-medium">
          Email
          <input type="email" className={input} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
        </label>
        <label className="space-y-2 text-sm font-medium">
          Temporary password
          <input type="password" minLength={12} maxLength={128} className={input} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
          <p className="mt-1 text-xs text-muted-foreground">At least 12 characters with a letter and a number. The user must change it after first login.</p>
        </label>
        <label className="space-y-2 text-sm font-medium">
          Phone
          <input className={input} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        </label>
        <label className="space-y-2 text-sm font-medium">
          Role
          <select className={input} value={form.role_id} onChange={(event) => setForm({ ...form, role_id: event.target.value })} required>
            {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium">
          Status
          <select className={input} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as "active" | "inactive" })}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium">
          Profile photo
          <input type="file" accept="image/jpeg,image/png,image/webp" className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" onChange={(event) => setAvatar(event.target.files?.[0] ?? null)} />
          <span className="block text-xs font-normal text-muted-foreground">Optional JPG, PNG, or WEBP image under 2 MB.</span>
        </label>
      </div>

      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-3 border-t pt-5">
        <Button type="button" variant="outline" onClick={() => router.push("/home/users")}>Cancel</Button>
        <Button disabled={saving || roles.length === 0}>{saving ? "Saving..." : "Save User"}</Button>
      </div>
    </form>
  );
}
