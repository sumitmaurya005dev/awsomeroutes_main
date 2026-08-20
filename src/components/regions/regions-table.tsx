"use client";

import * as React from "react";
import Image from "next/image";

import type { Region } from "@/types/region";
import type { RegionWithCountry } from "@/lib/regions/queries";

import { DataPagination } from "@/components/common/data-pagination";
import { EditRegionDialog } from "./edit-region-dialog";

interface RegionsTableProps {
  data: RegionWithCountry[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
  canManage?: boolean;
}

export function RegionsTable({
  data,
  count,
  page,
  limit,
  totalPages,
  canManage = false,
}: RegionsTableProps) {
  const [editingRegion, setEditingRegion] =
    React.useState<RegionWithCountry | null>(null);

  return (
    <>
      <div className="space-y-4">
        {/* Table Card */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {/* Horizontal scroll only */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  {/* Region */}
                  <th className="px-5 py-4 text-left font-semibold text-foreground">
                    Region
                  </th>

                  {/* Country */}
                  <th className="px-5 py-4 text-left font-semibold text-foreground">
                    Country
                  </th>

                  {/* Status */}
                  <th className="px-5 py-4 text-left font-semibold text-foreground">
                    Status
                  </th>

                  {/* Created */}
                  <th className="px-5 py-4 text-left font-semibold text-foreground">
                    Created
                  </th>

                  {/* Actions */}
                  <th className="px-5 py-4 text-right font-semibold text-foreground">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-16 text-center"
                    >
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          🌎
                        </div>

                        <h3 className="text-sm font-semibold text-foreground">
                          No regions found
                        </h3>

                        <p className="mt-1 text-sm text-muted-foreground">
                          There are no regions matching your current
                          filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.map((region) => (
                    <tr
                      key={region.id}
                      className="group transition-colors hover:bg-muted/30"
                    >
                      {/* Region */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {region.image_url ? (
                            <Image
                              src={region.image_url}
                              alt={region.name}
                              width={40}
                              height={40}
                              className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-xs font-bold text-secondary-foreground">
                              {region.name
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">
                              {region.name}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {region.slug}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Country */}
                      <td className="px-5 py-4">
                        {region.country ? (
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">
                              {region.country.name}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {region.country.slug}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        {region.status === "active" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Created */}
                      <td className="px-5 py-4 text-sm text-muted-foreground">
                        {formatDate(region.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {canManage && (
                            <>
                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingRegion(region)
                                }
                                className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              >
                                Edit
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => {
                                  // Delete functionality
                                  // will be connected next.
                                }}
                                className="inline-flex h-8 items-center justify-center rounded-md border border-destructive/30 bg-destructive/5 px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <DataPagination
          page={page}
          totalPages={totalPages}
          count={count}
          limit={limit}
        />
      </div>

      {/* Edit Region Dialog */}
      {editingRegion && (
        <EditRegionDialog
          region={editingRegion}
          open={!!editingRegion}
          onOpenChange={(open) => {
            if (!open) {
              setEditingRegion(null);
            }
          }}
        />
      )}
    </>
  );
}

// --------------------------------------------------
// Date Formatter
// --------------------------------------------------

function formatDate(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}