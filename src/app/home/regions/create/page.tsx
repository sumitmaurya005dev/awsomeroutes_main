import Link from "next/link";
import { ArrowLeft, Map } from "lucide-react";

import { AddRegionForm } from "@/components/regions/add-region-form";
import { getCountries } from "@/lib/countries/queries";

export default async function CreateRegionPage() {
  const { data: countries } = await getCountries({
    limit: 100,
    status: "active",
  });

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto w-full max-w-[1000px] space-y-6 p-4 sm:p-6 lg:p-8">
        <Link href="/home/regions" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Regions
        </Link>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Map className="h-6 w-6" /></div>
            <div><h1 className="text-2xl font-semibold">Add Region</h1><p className="mt-1 text-sm text-muted-foreground">Create a region and choose an existing image or upload a new one.</p></div>
          </div>
        </div>
        <AddRegionForm countries={countries.map(({ id, name }) => ({ id, name }))} />
      </div>
    </div>
  );
}
