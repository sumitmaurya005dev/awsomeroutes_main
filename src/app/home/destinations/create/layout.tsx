import { requirePermission } from "@/lib/auth";

export default async function CreateDestinationLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("destinations.create");
  return children;
}
