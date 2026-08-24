
// "use client";

// import * as React from "react";

// import type { Country } from "@/types/country";
// import { EditCountryDialog } from "./edit-country-dialog";
// import Image from "next/image";

// interface CountriesTableProps {
//   data: Country[];
//   count: number;
//   page: number;
//   limit: number;
//   totalPages: number;
// }

// export function CountriesTable({
//   data,
//   count,
//   page,
//   limit,
//   totalPages,
// }: CountriesTableProps) {
//   const [editingCountry, setEditingCountry] = React.useState<Country | null>(
//     null,
//   );

//   const start = count === 0 ? 0 : (page - 1) * limit + 1;
//   const end = Math.min(page * limit, count);

//   return (
//     <>
//       <div className="space-y-4">
//         {/* Table Card */}
//         <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
//           {/* Horizontal scroll only */}
//           <div className="overflow-x-auto">
//             <table className="w-full min-w-225 text-sm">
//               <thead className="border-b border-border bg-muted/40">
//                 <tr>
//                   <th className="px-5 py-4 text-left font-semibold text-foreground">
//                     Country
//                   </th>

//                   <th className="px-5 py-4 text-left font-semibold text-foreground">
//                     ISO Code
//                   </th>

//                   <th className="px-5 py-4 text-left font-semibold text-foreground">
//                     Phone Code
//                   </th>

//                   <th className="px-5 py-4 text-left font-semibold text-foreground">
//                     Status
//                   </th>

//                   <th className="px-5 py-4 text-left font-semibold text-foreground">
//                     Created
//                   </th>

//                   <th className="px-5 py-4 text-right font-semibold text-foreground">
//                     Actions
//                   </th>
//                 </tr>
//               </thead>

//               <tbody className="divide-y divide-border">
//                 {data.length === 0 ? (
//                   <tr>
//                     <td colSpan={6} className="px-5 py-16 text-center">
//                       <div className="mx-auto flex max-w-sm flex-col items-center">
//                         <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
//                           🌍
//                         </div>

//                         <h3 className="text-sm font-semibold text-foreground">
//                           No countries found
//                         </h3>

//                         <p className="mt-1 text-sm text-muted-foreground">
//                           There are no countries matching your current filters.
//                         </p>
//                       </div>
//                     </td>
//                   </tr>
//                 ) : (
//                   data.map((country) => (
//                     <tr
//                       key={country.id}
//                       className="group transition-colors hover:bg-muted/30"
//                     >
//                       {/* Country */}
//                       <td className="px-5 py-4">
//                         <div className="flex items-center gap-3">
//                           {country.image_url ? (
//                             <Image
//                               src={country.image_url}
//                               alt={country.name}
//                               className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover"
//                             />
//                           ) : (
//                             <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-xs font-bold text-secondary-foreground">
//                               {country.name.slice(0, 2).toUpperCase()}
//                             </div>
//                           )}

//                           <div className="min-w-0">
//                             <p className="truncate font-medium text-foreground">
//                               {country.name}
//                             </p>

//                             <p className="mt-0.5 truncate text-xs text-muted-foreground">
//                               {country.slug}
//                             </p>
//                           </div>
//                         </div>
//                       </td>

//                       {/* ISO */}
//                       <td className="px-5 py-4">
//                         {country.iso_code ? (
//                           <span className="inline-flex rounded-md border border-border bg-muted/50 px-2.5 py-1 font-mono text-xs font-medium text-foreground">
//                             {country.iso_code}
//                           </span>
//                         ) : (
//                           <span className="text-muted-foreground">—</span>
//                         )}
//                       </td>

//                       {/* Phone */}
//                       <td className="px-5 py-4 text-sm text-foreground">
//                         {country.phone_code || (
//                           <span className="text-muted-foreground">—</span>
//                         )}
//                       </td>

//                       {/* Status */}
//                       <td className="px-5 py-4">
//                         {country.status === "active" ? (
//                           <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-foreground">
//                             <span className="h-1.5 w-1.5 rounded-full bg-primary" />
//                             Active
//                           </span>
//                         ) : (
//                           <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
//                             <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
//                             Inactive
//                           </span>
//                         )}
//                       </td>

//                       {/* Created */}
//                       <td className="px-5 py-4 text-sm text-muted-foreground">
//                         {formatDate(country.created_at)}
//                       </td>

//                       {/* Actions */}
//                       <td className="px-5 py-4">
//                         <div className="flex items-center justify-end gap-2">
//                           {/* Edit */}
//                           <button
//                             type="button"
//                             onClick={() => setEditingCountry(country)}
//                             className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
//                           >
//                             Edit
//                           </button>

//                           {/* Delete */}
//                           <button
//                             type="button"
//                             onClick={() => {
//                               // Delete functionality will be
//                               // connected in the next step.
//                             }}
//                             className="inline-flex h-8 items-center justify-center rounded-md border border-destructive/30 bg-destructive/5 px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
//                           >
//                             Delete
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>

//         {/* Pagination Information */}
//         <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
//           <p className="text-muted-foreground">
//             Showing <span className="font-medium text-foreground">{start}</span>
//             {"–"}
//             <span className="font-medium text-foreground">{end}</span> of{" "}
//             <span className="font-medium text-foreground">{count}</span>{" "}
//             countries
//           </p>

//           <p className="text-muted-foreground">
//             Page <span className="font-medium text-foreground">{page}</span> of{" "}
//             <span className="font-medium text-foreground">
//               {Math.max(totalPages, 1)}
//             </span>
//           </p>
//         </div>
//       </div>

//       {/* Edit Country Dialog */}
//       {editingCountry && (
//         <EditCountryDialog
//           country={editingCountry}
//           open={!!editingCountry}
//           onOpenChange={(open) => {
//             if (!open) {
//               setEditingCountry(null);
//             }
//           }}
//         />
//       )}
//     </>
//   );
// }

// function formatDate(date: string | null) {
//   if (!date) return "—";

//   return new Intl.DateTimeFormat("en-IN", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//   }).format(new Date(date));
// }

// ------------------------------------------- new code here------------------------------------------

"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { DataPagination } from "@/components/common/data-pagination";
import { deleteCountryAction } from "@/actions/countries/actions";

import type { Country } from "@/types/country";
import { EditCountryDialog } from "./edit-country-dialog";

interface CountriesTableProps {
  data: Country[];
  count: number;
  page: number;
  limit: number;
  totalPages: number;
  canUpdate?: boolean;
  canDelete?: boolean;
}

export function CountriesTable({
  data,
  count,
  page,
  limit,
  totalPages,
  canUpdate = false,
  canDelete = false,
}: CountriesTableProps) {
  const router = useRouter();
  const [editingCountry, setEditingCountry] =
    React.useState<Country | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  async function handleDelete(country: Country) {
    if (!window.confirm(`Delete ${country.name}? This action cannot be undone.`)) return;
    setDeletingId(country.id);
    setDeleteError(null);
    try {
      const result = await deleteCountryAction(country.id);
      if (!result.success) {
        setDeleteError(result.error);
        return;
      }
      router.refresh();
    } catch {
      setDeleteError("Failed to delete country.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="space-y-4">
        {deleteError && <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{deleteError}</p>}

        {/* Table Card */}

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">

          <div className="overflow-x-auto">

            <table className="w-full min-w-225 text-sm">

              <thead className="border-b border-border bg-muted/40">

                <tr>

                  <th className="px-5 py-4 text-left font-semibold text-foreground">
                    Country
                  </th>

                  <th className="px-5 py-4 text-left font-semibold text-foreground">
                    ISO Code
                  </th>

                  <th className="px-5 py-4 text-left font-semibold text-foreground">
                    Phone Code
                  </th>

                  <th className="px-5 py-4 text-left font-semibold text-foreground">
                    Status
                  </th>

                  <th className="px-5 py-4 text-left font-semibold text-foreground">
                    Created
                  </th>

                  <th className="px-5 py-4 text-right font-semibold text-foreground">
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-border">

                {data.length === 0 ? (

                  <tr>

                    <td
                      colSpan={6}
                      className="px-5 py-16 text-center"
                    >

                      <div className="mx-auto flex max-w-sm flex-col items-center">

                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          🌍
                        </div>

                        <h3 className="text-sm font-semibold text-foreground">
                          No countries found
                        </h3>

                        <p className="mt-1 text-sm text-muted-foreground">
                          There are no countries matching your current filters.
                        </p>

                      </div>

                    </td>

                  </tr>

                ) : (

                  data.map((country) => (

                    <tr
                      key={country.id}
                      className="group transition-colors hover:bg-muted/30"
                    >

                      {/* Country */}

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-3">

                          {country.image_url ? (

                            <Image
                              src={country.image_url}
                              alt={country.name}
                              width={40}
                              height={40}
                              className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover"
                            />

                          ) : (

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-xs font-bold text-secondary-foreground">
                              {country.name
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>

                          )}

                          <div className="min-w-0">

                            <p className="truncate font-medium text-foreground">
                              {country.name}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {country.slug}
                            </p>

                          </div>

                        </div>

                      </td>

                      {/* ISO */}

                      <td className="px-5 py-4">

                        {country.iso_code ? (

                          <span className="inline-flex rounded-md border border-border bg-muted/50 px-2.5 py-1 font-mono text-xs font-medium text-foreground">
                            {country.iso_code}
                          </span>

                        ) : (

                          <span className="text-muted-foreground">
                            —
                          </span>

                        )}

                      </td>

                      {/* Phone */}

                      <td className="px-5 py-4 text-sm text-foreground">

                        {country.phone_code || (

                          <span className="text-muted-foreground">
                            —
                          </span>

                        )}

                      </td>

                      {/* Status */}

                      <td className="px-5 py-4">

                        {country.status === "active" ? (

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
                        {formatDate(country.created_at)}
                      </td>

                      {/* Actions */}

                      <td className="px-5 py-4">

                        <div className="flex items-center justify-end gap-2">

                          {canUpdate && (
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingCountry(country)
                                }
                                className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              >
                                Edit
                              </button>
                          )}
                          {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDelete(country)}
                                disabled={deletingId === country.id}
                                className="inline-flex h-8 items-center justify-center rounded-md border border-destructive/30 bg-destructive/5 px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              >
                                {deletingId === country.id ? "Deleting..." : "Delete"}
                              </button>
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

      {/* Edit Country Dialog */}

      {editingCountry && (

        <EditCountryDialog
          country={editingCountry}
          open={!!editingCountry}
          onOpenChange={(open) => {
            if (!open) {
              setEditingCountry(null);
            }
          }}
        />

      )}

    </>
  );
}

function formatDate(date: string | null) {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(new Date(date));
}
