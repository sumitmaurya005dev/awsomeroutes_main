import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import { getAssignableRoles } from "@/lib/rbac/admin";
import { AddUserForm } from "@/components/users/add-user-form";

export default async function CreateUserPage() {
  const { roles } = await getAssignableRoles();
  return <main className="min-h-full bg-background"><div className="mx-auto w-full max-w-[1000px] space-y-6 p-4 sm:p-6 lg:p-8"><Link href="/home/users" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back to Users</Link><div className="flex items-start gap-4 rounded-2xl border bg-card p-5 shadow-sm"><div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><UserPlus className="h-6 w-6" /></div><div><h1 className="text-2xl font-semibold">Add User</h1><p className="mt-1 text-sm text-muted-foreground">Create a portal user and assign the correct role.</p></div></div><AddUserForm roles={roles} /></div></main>;
}
