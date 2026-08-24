import { notFound } from "next/navigation";
import { hasPermission } from "@/lib/auth";
import { getRolesData } from "@/lib/rbac/admin";
import { RbacListPage } from "@/components/rbac/rbac-list-page";

export default async function RolesPage() {
  if (!(await hasPermission("roles.view"))) notFound();
  const [{ roles, permissions, rolePermissions }, canCreate, canUpdate] = await Promise.all([getRolesData(), hasPermission("roles.create"), hasPermission("roles.update")]);
  return <RbacListPage kind="roles" roles={roles} permissions={permissions} rolePermissions={rolePermissions} canCreate={canCreate} canUpdate={canUpdate} />;
}
