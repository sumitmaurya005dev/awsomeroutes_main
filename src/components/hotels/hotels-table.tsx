"use client";
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BedDouble,
  Hotel,
  Loader2,
  MapPin,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import { DataPagination } from "@/components/common/data-pagination";
import { deleteHotel } from "@/lib/hotels/mutations";
import { getNetworkErrorMessage } from "@/lib/client/network-error";
import type { HotelListItem } from "@/types/hotel";

const statusStyles: Record<HotelListItem["status"], string> = {
  active:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  draft:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  temporarily_unavailable:
    "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300",
  inactive:
    "border-border bg-muted/60 text-muted-foreground",
};

export function HotelsTable({
  data,
  count,
  page,
  limit,
  totalPages,
  canUpdate,
  canDelete,
}: {
  data: HotelListItem[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null),
    [error, setError] = React.useState<string | null>(null);
  async function remove(x: HotelListItem) {
    if (
      !confirm(
        `Delete ${x.name}? Use inactive status when it is referenced by a package.`,
      )
    )
      return;
    setBusy(x.id);
    setError(null);
    try {
      const result = await deleteHotel(x.id);
      if (!result.success) setError(result.error);
      else router.refresh();
    } catch (deleteError) {
      setError(getNetworkErrorMessage(deleteError));
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-5 py-4 text-left">Hotel</th>
                <th className="px-5 py-4 text-left">Location</th>
                <th className="px-5 py-4 text-left">Rooms</th>
                <th className="px-5 py-4 text-left">Status</th>
                <th className="px-5 py-4 text-left">Created</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.length ? (
                data.map((x) => (
                  <tr
                    key={x.id}
                    className="group transition-colors hover:bg-muted/25"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {x.featured_image?.original_url ? (
                          <Image
                            src={x.featured_image.original_url}
                            alt={x.featured_image.alt_text ?? x.name}
                            width={56}
                            height={56}
                            unoptimized
                            className="h-14 w-14 rounded-xl border object-cover shadow-sm"
                          />
                        ) : (
                          <div className="grid h-14 w-14 place-items-center rounded-xl border bg-primary/10 text-primary">
                            <Hotel className="h-6 w-6" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{x.name}</p>
                            {x.is_featured && (
                              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                Featured
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            {x.star_rating ? (
                              <span className="inline-flex items-center gap-1 text-amber-600">
                                <Star className="h-3.5 w-3.5 fill-current" />
                                {x.star_rating}
                              </span>
                            ) : null}
                            <span className="truncate">{x.slug}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <div>
                          <p className="font-medium">
                            {x.location?.name ?? "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {x.location?.destination?.name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium">
                        <BedDouble className="h-3.5 w-3.5 text-primary" />
                        {x.room_count} {x.room_count === 1 ? "room" : "rooms"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[x.status]}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {x.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {new Intl.DateTimeFormat("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(x.created_at))}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {canUpdate && (
                          <Link
                            href={`/home/hotels/${x.id}/edit`}
                            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Link>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            disabled={busy === x.id}
                            onClick={() => remove(x)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
                          >
                            {busy === x.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            {busy === x.id ? "Deleting" : "Delete"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="p-16 text-center text-muted-foreground"
                  >
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                      <span className="grid h-12 w-12 place-items-center rounded-full bg-muted">
                        <Hotel className="h-5 w-5 text-muted-foreground" />
                      </span>
                      <div>
                        <p className="font-medium text-foreground">
                          No hotels found
                        </p>
                        <p className="mt-1 text-xs">
                          Try changing the search or status filter.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <DataPagination
        page={page}
        totalPages={totalPages}
        count={count}
        limit={limit}
      />
    </div>
  );
}
