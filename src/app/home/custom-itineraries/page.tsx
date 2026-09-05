import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, Plus } from "lucide-react";
import SearchInput from "@/components/common/search-input";
import FilterSelect from "@/components/common/filter-select";
import {
  getCustomItineraries,
  itineraryPermissions,
} from "@/lib/custom-itineraries/queries";
import { quoteReference } from "@/lib/custom-itineraries/document";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  const p = await itineraryPermissions();
  if (!p.view) notFound();
  const query = await searchParams;
  const page = Math.min(
    100000,
    Math.max(1, Math.floor(Number(query.page)) || 1),
  );
  const result = await getCustomItineraries(page, query.search, query.status),
    pages = Math.max(1, Math.ceil(result.count / result.limit));
  const link = (n: number) =>
    "/home/custom-itineraries?" +
    new URLSearchParams({
      page: String(n),
      search: query.search ?? "",
      status: query.status ?? "all",
    });
  return (
    <main className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      <p className="text-sm text-muted-foreground">
        <Link href="/home">Home</Link> / Custom Itineraries
      </p>
      <header className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <ClipboardList
            aria-hidden
            className="h-10 w-10 rounded-lg bg-primary/10 p-2 text-primary"
          />
          <div>
            <h1 className="text-2xl font-semibold">
              Custom Itineraries{" "}
              <span className="text-sm text-muted-foreground">
                ({result.count})
              </span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tailored journeys, live costing and versioned customer quotations.
            </p>
          </div>
        </div>
        {p.create && (
          <Link
            href="/home/custom-itineraries/create"
            className="flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            <Plus aria-hidden size={16} />
            Create itinerary
          </Link>
        )}
      </header>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-semibold">All itineraries</h2>
          <div className="flex flex-wrap gap-3">
            <SearchInput
              placeholder="Search title, customer or phone…"
              className="w-full sm:w-80"
            />
            <FilterSelect
              paramName="status"
              defaultValue="all"
              options={[
                "all",
                "draft",
                "quoted",
                "sent",
                "accepted",
                "rejected",
                "expired",
              ].map((x) => ({
                value: x,
                label:
                  x === "all"
                    ? "All statuses"
                    : x[0].toUpperCase() + x.slice(1),
              }))}
              className="w-44"
            />
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                {[
                  "Quotation",
                  "Customer",
                  "Travel date",
                  "Guests",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th key={h} className="whitespace-nowrap p-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.data.map((v) => (
                <tr key={v.id} className="border-b last:border-0">
                  <td className="min-w-56 p-4">
                    <b>{v.title}</b>
                    <p className="text-xs text-muted-foreground">
                      {quoteReference(v.quote_number)} · revision{" "}
                      {v.current_revision}
                    </p>
                  </td>
                  <td className="p-4">
                    {v.customer_name}
                    <p className="text-xs text-muted-foreground">
                      {v.customer_phone}
                    </p>
                  </td>
                  <td className="whitespace-nowrap p-4">
                    {v.travel_date || "Not set"}
                  </td>
                  <td className="p-4">{v.adults + v.children + v.infants}</td>
                  <td className="p-4">
                    <span className="rounded-full border px-3 py-1 text-xs capitalize">
                      {v.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <Link
                      className="inline-flex min-h-11 items-center rounded-lg border px-4 font-medium hover:bg-muted"
                      href={"/home/custom-itineraries/" + v.id}
                    >
                      {v.status === "draft" && p.update ? "Edit" : "View"}
                    </Link>
                  </td>
                </tr>
              ))}
              {!result.data.length && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-10 text-center text-muted-foreground"
                  >
                    No matching itineraries.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <nav
        aria-label="Pagination"
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 text-sm"
      >
        <p>
          {result.count
            ? (page - 1) * result.limit +
              1 +
              "–" +
              Math.min(page * result.limit, result.count) +
              " of " +
              result.count
            : "0 itineraries"}
        </p>
        <div className="flex items-center gap-4">
          {page > 1 && (
            <Link href={link(page - 1)} className="rounded-lg border px-4 py-3">
              Previous
            </Link>
          )}
          <span>
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link
              href={link(page + 1)}
              className="rounded-lg bg-primary px-4 py-3 text-primary-foreground"
            >
              Next
            </Link>
          )}
        </div>
      </nav>
    </main>
  );
}
