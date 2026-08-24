import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";

import { PermissionForm } from "@/components/rbac/permission-form";
import { getPermissionEditorData } from "@/lib/rbac/admin";

export default async function EditPermissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { permission } = await getPermissionEditorData(id);
  return (
    <main className="min-h-full bg-background">
      <div className="mx-auto w-full max-w-[1000px] space-y-6 p-4 sm:p-6 lg:p-8">
        <Link href="/home/permissions" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to Permissions</Link>
        <div className="flex items-start gap-4 rounded-2xl border bg-card p-5 shadow-sm"><div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><KeyRound className="h-6 w-6" /></div><div><h1 className="text-2xl font-semibold">Edit Permission</h1><p className="mt-1 text-sm text-muted-foreground">Update the description for {permission.permission_key}.</p></div></div>
        <PermissionForm permission={permission} />
      </div>
    </main>
  );
}
