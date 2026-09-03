import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Package } from "lucide-react";
import { PackageCoreForm } from "@/components/packages/package-core-form";
import { getPackageReferenceData } from "@/lib/packages/queries";
import { hasPermission } from "@/lib/auth";

export default async function CreatePackagePage(){if(!(await hasPermission("packages.create")))notFound();const [refs,canPublish,canBrowseMedia,canUploadMedia]=await Promise.all([getPackageReferenceData(),hasPermission("packages.publish"),hasPermission("media.view"),hasPermission("media.create")]);return <main className="min-h-full bg-background"><div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8"><Link href="/home/packages" className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4"/>Back to Packages</Link><section className="flex items-start gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-6"><span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><Package/></span><div><h1 className="text-2xl font-semibold">Create Package</h1><p className="text-sm text-muted-foreground">Step 1 saves essentials. Step 2 builds days with automatic location hotel pricing, activities and cumulative package totals.</p></div></section><PackageCoreForm refs={refs} permissions={{canCreate:true,canUpdate:false,canDelete:false,canManagePricing:false,canPublish,canBrowseMedia,canUploadMedia}}/></div></main>}
