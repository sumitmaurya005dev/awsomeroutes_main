import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { PackageContentDefaultsManager } from "@/components/packages/package-content-defaults-manager";
import { hasPermission } from "@/lib/auth";
import { getPackageContentTemplates } from "@/lib/packages/queries";

export default async function PackageContentDefaultsPage(){
  if(!(await hasPermission("packages.manage_defaults")))notFound();
  const templates=await getPackageContentTemplates();
  return <main className="min-h-full bg-background"><div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
    <Link href="/home/packages" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4"/>Back to Packages</Link>
    <section className="flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-start gap-4"><span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><FileText/></span><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold">Package Content Defaults</h1><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{templates.length} versions</span></div><p className="mt-1 text-sm text-muted-foreground">Manage reusable inclusions, exclusions, terms and customer policies copied into package snapshots.</p></div></div></section>
    <PackageContentDefaultsManager templates={templates}/>
  </div></main>;
}
