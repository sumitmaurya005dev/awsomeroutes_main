import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Users } from "lucide-react";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { getUsersData } from "@/lib/rbac/admin";
import { UsersManagementTable } from "@/components/users/users-management-table";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

export default async function UsersPage() {
  if (!(await hasPermission("users.view"))) notFound();
  const [{ profiles, roles }, canCreate, canUpdate, currentUser] = await Promise.all([
    getUsersData(),
    hasPermission("users.create"),
    hasPermission("users.update"),
    getCurrentUser(),
  ]);

  return <main className="min-h-full bg-background"><div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8"><Breadcrumb><BreadcrumbList><BreadcrumbItem><BreadcrumbLink render={<Link href="/home" />}>Home</BreadcrumbLink></BreadcrumbItem><BreadcrumbSeparator /><BreadcrumbItem><BreadcrumbPage>Users</BreadcrumbPage></BreadcrumbItem></BreadcrumbList></Breadcrumb><div className="flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-start gap-4"><div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><Users className="h-6 w-6" /></div><div><div className="flex items-center gap-2"><h1 className="text-2xl font-semibold">Users</h1><span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{profiles.length} users</span></div><p className="mt-1 text-sm text-muted-foreground">Manage portal users, their roles, and account access.</p></div></div>{canCreate && <Link href="/home/users/create" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" />Add User</Link>}</div><UsersManagementTable users={profiles} roles={roles} canUpdate={canUpdate} canEditIdentity={currentUser?.role.slug === "super_admin"} /></div></main>;
}
