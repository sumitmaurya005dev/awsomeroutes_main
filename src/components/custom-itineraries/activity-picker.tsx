"use client";
import { useState } from "react";
import { Field } from "./fields";
export function ActivityPicker({
  options,
  selectedIds,
  onAdd,
  onRemove,
}: {
  options: {
    id: string;
    name: string;
    available: boolean;
    unavailableReason?: string;
    editHref?: string;
  }[];
  selectedIds: string[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = options.filter((x) =>
    x.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <div className="space-y-3">
      <Field
        label="Search activities at this location"
        value={query}
        onChange={setQuery}
      />
      <p role="status" className="text-xs text-muted-foreground">
        {options.filter((x) => x.available).length} available of{" "}
        {options.length} configured activities at this location.
      </p>
      <ul
        className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2"
        aria-label="Available activities"
      >
        {filtered.map((x) => {
          const selected = selectedIds.includes(x.id);
          return (
            <li
              key={x.id}
              className={
                "min-w-0 rounded-lg border p-3 " +
                (selected ? "border-primary bg-primary/10" : "bg-background")
              }
            >
              <p className="text-sm font-medium">{x.name}</p>
              <button
                type="button"
                disabled={!x.available}
                aria-label={
                  x.available
                    ? selected
                      ? `Remove ${x.name} from day`
                      : `Add ${x.name} to day`
                    : `Unavailable ${x.name}`
                }
                aria-pressed={x.available ? selected : undefined}
                onClick={() => (selected ? onRemove(x.id) : onAdd(x.id))}
                className={
                  "mt-3 min-h-11 w-full rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed " +
                  (selected
                    ? "border-destructive/50 bg-destructive/5 text-destructive hover:bg-destructive/10"
                    : x.available
                      ? "bg-background hover:bg-muted"
                      : "bg-muted/40 text-muted-foreground")
                }
              >
                {selected
                  ? "Remove from day"
                  : x.available
                    ? "Add to day"
                    : "Not available"}
              </button>
              {!x.available && (
                <p className="mt-2 text-xs text-destructive">
                  {x.unavailableReason ?? "Unavailable"}
                </p>
              )}
              {!x.available && x.editHref && (
                <a
                  href={x.editHref}
                  className="mt-1 inline-flex min-h-11 items-center text-xs font-medium underline underline-offset-4"
                >
                  Open activity settings
                </a>
              )}
            </li>
          );
        })}
      </ul>
      {!filtered.length && (
        <p className="text-sm text-muted-foreground">
          {options.length
            ? "No matching activity. Clear the search or try a shorter name."
            : "No activity is configured for this location. Add an offering in Activity Management first."}
        </p>
      )}
    </div>
  );
}
