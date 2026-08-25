"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { searchActivityLocations } from "@/lib/activities/location-search";
import { getNetworkErrorMessage } from "@/lib/client/network-error";
import { cn } from "@/lib/utils";
import type { ActivityLocationOption } from "@/types/activity";

function locationLabel(location: ActivityLocationOption) {
  return [
    location.countryName,
    location.regionName,
    location.destinationName,
    location.name,
  ]
    .filter(Boolean)
    .join(" › ");
}

export function ActivityLocationCombobox({
  value,
  initialOption,
  disabled,
  onChange,
}: {
  value: string;
  initialOption: ActivityLocationOption | null;
  disabled?: boolean;
  onChange: (location: ActivityLocationOption) => void;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [results, setResults] = React.useState<ActivityLocationOption[]>(
    initialOption ? [initialOption] : [],
  );
  const [selected, setSelected] = React.useState<ActivityLocationOption | null>(
    initialOption,
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    let current = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const locations = await searchActivityLocations(search);
        if (current) setResults(locations);
      } catch (searchError) {
        if (current) {
          setError(
            getNetworkErrorMessage(
              searchError,
              "Locations could not be searched.",
            ),
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

  function choose(location: ActivityLocationOption) {
    setSelected(location);
    onChange(location);
    setSearch("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls="activity-location-options"
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => {
          setOpen((current) => !current);
          window.setTimeout(() => searchInputRef.current?.focus(), 0);
        }}
        className="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg border border-input bg-background px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          className={cn("min-w-0 truncate", !value && "text-muted-foreground")}
        >
          {value && selected
            ? locationLabel(selected)
            : "Search and select a location"}
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl">
          <div className="relative border-b p-2">
            <Search className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchInputRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setOpen(false);
                if (event.key === "Enter" && results.length === 1) {
                  event.preventDefault();
                  choose(results[0]);
                }
              }}
              placeholder="Search location name..."
              className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/30"
            />
          </div>
          <div
            id="activity-location-options"
            role="listbox"
            className="max-h-72 overflow-y-auto p-1"
          >
            {loading && (
              <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching
                locations...
              </div>
            )}
            {!loading && error && (
              <p className="px-3 py-6 text-center text-sm text-destructive">
                {error}
              </p>
            )}
            {!loading && !error && results.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                No active location found.
              </p>
            )}
            {!loading &&
              !error &&
              results.map((location) => (
                <button
                  key={location.id}
                  type="button"
                  role="option"
                  aria-selected={value === location.id}
                  onClick={() => choose(location)}
                  className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
                >
                  <Check
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0 text-primary",
                      value !== location.id && "invisible",
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block font-medium">{location.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[
                        location.countryName,
                        location.regionName,
                        location.destinationName,
                      ]
                        .filter(Boolean)
                        .join(" › ")}
                    </span>
                  </span>
                </button>
              ))}
          </div>
          {!loading && results.length === 30 && (
            <p className="border-t px-3 py-2 text-xs text-muted-foreground">
              Showing first 30 matches. Type more characters to narrow the
              results.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
