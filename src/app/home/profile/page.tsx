import { redirect } from "next/navigation";
import { UserRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { ProfileSettings } from "@/components/profile/profile-settings";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  return <main className="min-h-full bg-background"><div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8"><div className="flex items-start gap-4 rounded-2xl border bg-card p-5 shadow-sm"><div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><UserRound className="h-6 w-6" /></div><div><h1 className="text-2xl font-semibold">My Profile</h1><p className="mt-1 text-sm text-muted-foreground">Manage your personal details, profile photo, and password.</p></div></div><ProfileSettings profile={user} /></div></main>;
}
