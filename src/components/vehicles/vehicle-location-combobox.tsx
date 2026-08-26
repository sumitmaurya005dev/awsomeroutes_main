"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { searchVehicleLocations } from "@/lib/vehicles/location-search";
import { cn } from "@/lib/utils";
import type { VehicleLocationOption } from "@/types/vehicle";

const optionLabel = (option: VehicleLocationOption) =>
  [option.countryName, option.regionName, option.destinationName, option.name].filter(Boolean).join(" › ");

export function VehicleLocationCombobox({
  value,
  initialOption,
  onChange,
}: {
  value: string;
  initialOption: VehicleLocationOption | null;
  onChange: (option: VehicleLocationOption) => void;
}) {
  const root = React.useRef<HTMLDivElement>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [results, setResults] = React.useState<VehicleLocationOption[]>(initialOption ? [initialOption] : []);
  const [selected, setSelected] = React.useState(initialOption);
  const [loading, setLoading] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    let current = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const rows = await searchVehicleLocations(search);
        if (current) { setResults(rows); setActiveIndex(0); }
      } finally {
        if (current) setLoading(false);
      }
    }, 250);
    return () => { current = false; window.clearTimeout(timer); };
  }, [open, search]);

  function choose(option: VehicleLocationOption) {
    setSelected(option);
    onChange(option);
    setOpen(false);
    setSearch("");
  }

  function show() {
    setOpen(true);
    setActiveIndex(0);
    window.setTimeout(() => input.current?.focus(), 0);
  }

  function handleKeys(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      choose(results[activeIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  const listboxId = "vehicle-location-options";

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => open ? setOpen(false) : show()}
        onKeyDown={(event) => {
          if (!open && (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            show();
          }
        }}
        className="flex h-10 w-full items-center justify-between rounded-lg border bg-background px-3 text-left text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className={cn("truncate", !value && "text-muted-foreground")}>
          {value && selected ? optionLabel(selected) : "Search base location"}
        </span>
        <ChevronsUpDown className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute z-[70] mt-2 w-full overflow-hidden rounded-xl border bg-popover shadow-xl">
          <div className="relative border-b p-2">
            <Search className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input ref={input} role="combobox" aria-controls={listboxId} aria-expanded="true" aria-activedescendant={results[activeIndex] ? `${listboxId}-${activeIndex}` : undefined} value={search} onChange={(event) => { setSearch(event.target.value); setActiveIndex(0); }} onKeyDown={handleKeys} placeholder="Search locations..." className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50" />
          </div>
          <div id={listboxId} role="listbox" className="max-h-64 overflow-y-auto p-1">
            {loading ? (
              <p className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Searching...</p>
            ) : results.length ? results.map((option, index) => (
              <button id={`${listboxId}-${index}`} key={option.id} type="button" role="option" aria-selected={value === option.id} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(option)} className={cn("flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm", activeIndex === index && "bg-muted")}>
                <Check className={cn("mt-0.5 h-4 w-4 text-primary", value !== option.id && "invisible")} />
                <span><b className="block">{option.name}</b><span className="text-xs text-muted-foreground">{[option.countryName, option.regionName, option.destinationName].join(" › ")}</span></span>
              </button>
            )) : <p className="p-8 text-center text-sm text-muted-foreground">No active location found.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
