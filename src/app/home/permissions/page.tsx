import { notFound } from "next/navigation";
import { hasPermission } from "@/lib/auth";
import { getPermissionsData } from "@/lib/rbac/admin";
import { RbacListPage } from "@/components/rbac/rbac-list-page";

export default async function PermissionsPage() {
  if (!(await hasPermission("permissions.view"))) notFound();
  const [{ permissions }, canCreate, canUpdate] = await Promise.all([getPermissionsData(), hasPermission("permissions.create"), hasPermission("permissions.update")]);
  return <RbacListPage kind="permissions" permissions={permissions} canCreate={canCreate} canUpdate={canUpdate} />;
}
