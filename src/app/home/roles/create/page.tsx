import Link from "next/link";
import { ArrowLeft, ShieldPlus } from "lucide-react";
import { getRoleCreationData } from "@/lib/rbac/admin";
import { RoleForm } from "@/components/rbac/role-form";

export default async function CreateRolePage() {
  const data = await getRoleCreationData();
  return <main className="min-h-full bg-background"><div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8"><Link href="/home/roles" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to Roles</Link><div className="flex items-start gap-4 rounded-2xl border bg-card p-5 shadow-sm"><div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><ShieldPlus className="h-6 w-6" /></div><div><h1 className="text-2xl font-semibold">Create Role</h1><p className="mt-1 text-sm text-muted-foreground">Create a role and choose its inherited permissions.</p></div></div><RoleForm permissions={data.permissions} /></div></main>;
}
