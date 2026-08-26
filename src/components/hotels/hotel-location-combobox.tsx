"use client";
import * as React from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { searchHotelLocations } from "@/lib/hotels/location-search";
import { cn } from "@/lib/utils";
import type { HotelLocationOption } from "@/types/hotel";

const label = (x: HotelLocationOption) =>
  [x.countryName, x.regionName, x.destinationName, x.name]
    .filter(Boolean)
    .join(" › ");
export function HotelLocationCombobox({
  value,
  initialOption,
  disabled,
  onChange,
}: {
  value: string;
  initialOption: HotelLocationOption | null;
  disabled?: boolean;
  onChange: (x: HotelLocationOption) => void;
}) {
  const root = React.useRef<HTMLDivElement>(null),
    input = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false),
    [search, setSearch] = React.useState(""),
    [results, setResults] = React.useState<HotelLocationOption[]>(
      initialOption ? [initialOption] : [],
    ),
    [selected, setSelected] = React.useState<HotelLocationOption | null>(
      initialOption,
    ),
    [loading, setLoading] = React.useState(false),
    [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  React.useEffect(() => {
    if (!open) return;
    let current = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await searchHotelLocations(search);
        if (current) setResults(rows);
      } catch (e) {
        if (current) {
          setError(
            e instanceof Error ? e.message : "Locations could not be searched.",
          );
          setResults([]);
        }
      } finally {
        if (current) setLoading(false);
      }
    }, 250);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [open, search]);
  const choose = (x: HotelLocationOption) => {
    setSelected(x);
    onChange(x);
    setSearch("");
    setOpen(false);
  };
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls="hotel-location-options"
        disabled={disabled}
        onClick={() => {
          setOpen((x) => !x);
          window.setTimeout(() => input.current?.focus(), 0);
        }}
        className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-left text-sm disabled:opacity-50"
      >
        <span className={cn("truncate", !value && "text-muted-foreground")}>
          {value && selected ? label(selected) : "Search and select a location"}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border bg-popover shadow-xl">
          <div className="relative border-b p-2">
            <Search className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={input}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search location name..."
              className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none"
            />
          </div>
          <div
            id="hotel-location-options"
            role="listbox"
            className="max-h-72 overflow-y-auto p-1"
          >
            {loading ? (
              <div className="flex justify-center gap-2 p-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </div>
            ) : error ? (
              <p className="p-6 text-center text-sm text-destructive">
                {error}
              </p>
            ) : results.length ? (
              results.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => choose(x)}
                  className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <Check
                    className={cn(
                      "mt-0.5 h-4 w-4 text-primary",
                      value !== x.id && "invisible",
                    )}
                  />
                  <span>
                    <b className="block font-medium">{x.name}</b>
                    <span className="block text-xs text-muted-foreground">
                      {[x.countryName, x.regionName, x.destinationName]
                        .filter(Boolean)
                        .join(" › ")}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No active location found.
              </p>
            )}
          </div>
          {results.length === 30 && (
            <p className="border-t px-3 py-2 text-xs text-muted-foreground">
              First 30 matches shown. Type more to narrow results.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
