import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { RoleForm } from "@/components/rbac/role-form";
import { getRoleEditorData } from "@/lib/rbac/admin";

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getRoleEditorData(id);
  return (
    <main className="min-h-full bg-background">
      <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
        <Link href="/home/roles" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to Roles</Link>
        <div className="flex items-start gap-4 rounded-2xl border bg-card p-5 shadow-sm"><div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="h-6 w-6" /></div><div><h1 className="text-2xl font-semibold">Edit Role</h1><p className="mt-1 text-sm text-muted-foreground">Update {data.role.name} and the permissions inherited by its users.</p></div></div>
        <RoleForm role={data.role} permissions={data.permissions} initialPermissionIds={data.permissionIds} />
      </div>
    </main>
  );
}
