import { requirePermission } from "@/lib/auth";

export default async function CreateLocationLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("locations.create");
  return children;
}
