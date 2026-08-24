"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataPagination } from "@/components/common/data-pagination";
import { deleteLocation } from "@/lib/locations/mutations";
import { LocationForm } from "./location-form";
import type { LocationWithDestination } from "@/types/location";

type DestinationOption = { id: string; name: string; regionName: string };

type LocationsTableProps = {
  data: LocationWithDestination[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
  destinations: DestinationOption[];
  canUpdate: boolean;
  canDelete: boolean;
};

export function LocationsTable({ data, count, page, limit, totalPages, destinations, canUpdate, canDelete }: LocationsTableProps) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<LocationWithDestination | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  async function handleDelete(item: LocationWithDestination) {
    if (!window.confirm(`Delete ${item.name}? This action cannot be undone.`)) return;
    setDeletingId(item.id);
    setDeleteError(null);
    try {
      const result = await deleteLocation(item.id);
      if (!result.success) {
        setDeleteError(result.error);
        return;
      }
      router.refresh();
    } catch {
      setDeleteError("Failed to delete location.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {deleteError && <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{deleteError}</p>}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b bg-muted/40"><tr><th className="px-5 py-4 text-left">Location</th><th className="px-5 py-4 text-left">Destination</th><th className="px-5 py-4 text-left">Type</th><th className="px-5 py-4 text-left">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-border">
              {data.length ? data.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30">
                  <td className="px-5 py-4"><div className="flex items-center gap-3">{item.image_url ? <Image src={item.image_url} alt={item.name} width={40} height={40} className="h-10 w-10 rounded-lg object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted text-xs font-medium">{item.name.slice(0, 2).toUpperCase()}</div>}<div><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.slug}</p></div></div></td>
                  <td className="px-5 py-4"><p>{item.destination?.name ?? "—"}</p><p className="text-xs text-muted-foreground">{item.destination?.region?.name ?? ""}</p></td>
                  <td className="px-5 py-4 capitalize">{item.location_type.replace("_", " ")}</td>
                  <td className="px-5 py-4"><span className="rounded-full bg-muted px-2.5 py-1 text-xs">{item.status}</span></td>
                  <td className="px-5 py-4"><div className="flex items-center justify-end gap-2">{canUpdate && <button type="button" onClick={() => setEditing(item)} className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted">Edit</button>}{canDelete && <button type="button" onClick={() => handleDelete(item)} disabled={deletingId === item.id} className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-60">{deletingId === item.id ? "Deleting..." : "Delete"}</button>}</div></td>
                </tr>
              )) : <tr><td colSpan={5} className="px-5 py-16 text-center text-muted-foreground">No locations found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <DataPagination page={page} totalPages={totalPages} count={count} limit={limit} />
      {editing && <Dialog open onOpenChange={(open) => !open && setEditing(null)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Edit Location</DialogTitle></DialogHeader><LocationForm initial={editing} destinations={destinations} onSuccess={() => setEditing(null)} /></DialogContent></Dialog>}
    </>
  );
}
