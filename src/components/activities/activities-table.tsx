"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataPagination } from "@/components/common/data-pagination";
import { deleteActivity } from "@/lib/activities/mutations";
import { getNetworkErrorMessage } from "@/lib/client/network-error";
import type { ActivityListItem } from "@/types/activity";

type ActivitiesTableProps = {
  data: ActivityListItem[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
  canUpdate: boolean;
  canDelete: boolean;
};

export function ActivitiesTable({ data, count, page, limit, totalPages, canUpdate, canDelete }: ActivitiesTableProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function remove(item: ActivityListItem) {
    if (!window.confirm(`Delete ${item.name}? This also removes its unused offerings and pricing rules.`)) return;
    setDeletingId(item.id);
    setError(null);
    try {
      const result = await deleteActivity(item.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch (deleteError) {
      setError(getNetworkErrorMessage(deleteError));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b bg-muted/40"><tr><th className="px-5 py-4 text-left">Activity</th><th className="px-5 py-4 text-left">Category</th><th className="px-5 py-4 text-left">Locations</th><th className="px-5 py-4 text-left">Status</th><th className="px-5 py-4 text-left">Created</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
            <tbody className="divide-y">
              {data.length ? data.map((item) => (
                <tr key={item.id} className="hover:bg-muted/20">
                  <td className="px-5 py-4"><div className="flex items-center gap-3">{item.featured_image?.original_url ? <Image src={item.featured_image.original_url} alt={item.featured_image.alt_text ?? item.name} width={44} height={44} unoptimized className="h-11 w-11 rounded-lg object-cover" /> : <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">{item.name.slice(0, 2).toUpperCase()}</div>}<div><div className="flex items-center gap-2"><p className="font-medium">{item.name}</p>{item.is_featured && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">Featured</span>}</div><p className="text-xs text-muted-foreground">{item.slug}</p></div></div></td>
                  <td className="px-5 py-4">{item.category.name}</td>
                  <td className="px-5 py-4">{item.offering_count}</td>
                  <td className="px-5 py-4"><span className="rounded-full bg-muted px-2.5 py-1 text-xs capitalize">{item.status.replaceAll("_", " ")}</span></td>
                  <td className="px-5 py-4 text-muted-foreground">{new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(item.created_at))}</td>
                  <td className="px-5 py-4"><div className="flex justify-end gap-2">{canUpdate && <Link href={`/home/activities/${item.id}/edit`} className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted">Edit</Link>}{canDelete && <button type="button" onClick={() => remove(item)} disabled={deletingId === item.id} className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-60">{deletingId === item.id ? "Deleting..." : "Delete"}</button>}</div></td>
                </tr>
              )) : <tr><td colSpan={6} className="px-5 py-16 text-center text-muted-foreground">No activities found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <DataPagination page={page} totalPages={totalPages} count={count} limit={limit} />
    </div>
  );
}
