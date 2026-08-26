import { notFound } from "next/navigation";
import { CarFront } from "lucide-react";
import { hasPermission } from "@/lib/auth";
import { getVehicleAdminData } from "@/lib/vehicles/queries";
import { VehicleManagement } from "@/components/vehicles/vehicle-management";

export default async function VehiclesPage() {
  if (!(await hasPermission("vehicles.view"))) notFound();
  const [data, canCreate, canUpdate, canDelete, canManagePricing, canAssign] = await Promise.all([
    getVehicleAdminData(),
    hasPermission("vehicles.create"),
    hasPermission("vehicles.update"),
    hasPermission("vehicles.delete"),
    hasPermission("vehicles.manage_pricing"),
    hasPermission("vehicles.assign"),
  ]);
  return (
    <main className="min-h-full bg-background">
      <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><CarFront className="h-6 w-6" /></div>
            <div>
              <h1 className="text-2xl font-semibold">Vehicle Management</h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Manage comfortable passenger capacity, third-party vendors, fleet, private driver records and all-inclusive location pricing.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-muted/60 px-3 py-2"><b className="block text-base text-foreground">{data.models.length}</b>Models</div>
            <div className="rounded-lg bg-muted/60 px-3 py-2"><b className="block text-base text-foreground">{data.fleet.length}</b>Fleet</div>
            <div className="rounded-lg bg-muted/60 px-3 py-2"><b className="block text-base text-foreground">{data.rates.length}</b>Rates</div>
          </div>
        </section>
        <VehicleManagement data={data} permissions={{ canCreate, canUpdate, canDelete, canManagePricing, canAssign }} />
      </div>
    </main>
  );
}
