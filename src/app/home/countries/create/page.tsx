import Link from "next/link";
import { ArrowLeft, Globe2 } from "lucide-react";

import { AddCountryForm } from "@/components/countries/add-country-form";
import { requirePermission } from "@/lib/auth";

export default async function CreateCountryPage() {
  await requirePermission("countries.create");
  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto w-full max-w-[1000px] space-y-6 p-4 sm:p-6 lg:p-8">

        {/* Back */}
        <Link
          href="/home/countries"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Countries
        </Link>

        {/* Header */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Globe2 className="h-6 w-6" />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Add Country
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Add a new country to your travel platform.
              </p>
            </div>
          </div>
        </div>

        {/* Add Country Form */}
        <AddCountryForm />

      </div>
    </div>
  );
}
