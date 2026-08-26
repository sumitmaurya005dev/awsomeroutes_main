"use client";

import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type VehicleSelectOption = {
  value: string;
  label: string;
  description?: string;
  keywords?: string;
};

export function VehicleSearchableSelect({
  label,
  name,
  value,
  options,
  onValueChange,
  placeholder,
  searchPlaceholder = "Type to search...",
  emptyOptionLabel,
  required = false,
}: {
  label: string;
  name: string;
  value: string;
  options: VehicleSelectOption[];
  onValueChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  emptyOptionLabel?: string;
  required?: boolean;
}) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const selected = options.find((option) => option.value === value);
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = options.filter((option) =>
    !normalizedQuery || `${option.label} ${option.description ?? ""} ${option.keywords ?? ""}`.toLowerCase().includes(normalizedQuery),
  );
  const selectable = emptyOptionLabel
    ? [{ value: "", label: emptyOptionLabel } satisfies VehicleSelectOption, ...filtered]
    : filtered;

  React.useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function show() {
    setOpen(true);
    setActiveIndex(0);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function choose(option: VehicleSelectOption) {
    onValueChange(option.value);
    setQuery("");
    setOpen(false);
  }

  function handleKeys(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, Math.max(selectable.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && selectable[activeIndex]) {
      event.preventDefault();
      choose(selectable[activeIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  const listboxId = `${name}-vehicle-options`;

  return (
    <label className="block space-y-1.5 text-sm font-medium">
      <span>{label}{required && <span className="ml-1 text-destructive">*</span>}</span>
      <input type="hidden" name={name} value={value} data-required={required ? "true" : undefined} />
      <div ref={rootRef} className="relative">
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
          className={cn(
            "flex h-10 w-full items-center gap-2 rounded-lg border bg-background px-3 text-left text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            !selected && "text-muted-foreground",
          )}
        >
          <span className="min-w-0 flex-1 truncate">{selected?.label ?? (value ? "Unavailable selection" : placeholder)}</span>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </button>

        {open && (
          <div className="absolute z-[80] mt-2 w-full min-w-[260px] overflow-hidden rounded-xl border bg-popover shadow-xl">
            <div className="relative border-b p-2">
              <Search className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={inputRef}
                role="combobox"
                aria-controls={listboxId}
                aria-expanded="true"
                aria-activedescendant={selectable[activeIndex] ? `${listboxId}-${activeIndex}` : undefined}
                value={query}
                onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
                onKeyDown={handleKeys}
                placeholder={searchPlaceholder}
                className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
              />
            </div>
            <div id={listboxId} role="listbox" className="max-h-64 overflow-y-auto p-1">
              {selectable.length ? selectable.map((option, index) => (
                <button
                  id={`${listboxId}-${index}`}
                  key={option.value || "empty"}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(option)}
                  className={cn("flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm", activeIndex === index && "bg-muted")}
                >
                  <Check className={cn("mt-0.5 h-4 w-4 shrink-0 text-primary", option.value !== value && "invisible")} />
                  <span className="min-w-0"><b className="block truncate font-medium">{option.label}</b>{option.description && <span className="block truncate text-xs text-muted-foreground">{option.description}</span>}</span>
                </button>
              )) : <p className="p-8 text-center text-sm text-muted-foreground">No matching option found.</p>}
            </div>
          </div>
        )}
      </div>
    </label>
  );
}
