"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  finalizeCustomItinerary,
  changeCustomItineraryStatus,
  deleteCustomItinerary,
} from "@/lib/custom-itineraries/actions";
import type {
  ItineraryDetail,
  ItineraryPermissions,
} from "@/types/custom-itinerary";
export function ItineraryActions({
  value: v,
  permissions: p,
  blocked = false,
}: {
  value: ItineraryDetail;
  permissions: ItineraryPermissions;
  blocked?: boolean;
}) {
  const [pending, start] = useTransition(),
    [error, setError] = useState(""),
    router = useRouter();
  function run(action: string) {
    if (
      !window.confirm(
        action === "finalize"
          ? "Finalize the last SAVED draft with current catalog prices? Unsaved form changes are NOT included. This locks a permanent quotation revision."
          : action === "delete"
            ? "Delete this never-finalized draft? This cannot be undone."
            : action === "draft"
              ? "Start a new draft revision? Previous quotations remain unchanged."
              : "Record quotation as " + action + "?",
      )
    )
      return;
    setError("");
    start(async () => {
      try {
        const r =
          action === "finalize"
            ? await finalizeCustomItinerary(v.id, v.version)
            : action === "delete"
              ? await deleteCustomItinerary(v.id, v.version)
              : await changeCustomItineraryStatus(v.id, v.version, action);
        if (!r.success) {
          setError(r.error);
          return;
        }
        if (action === "delete") router.push("/home/custom-itineraries");
        else router.refresh();
      } catch {
        setError(
          "Connection interrupted. Reload to check the saved status before retrying.",
        );
      }
    });
  }
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap gap-3">
        {v.status === "draft" && p.finalize && (
          <Button
            type="button"
            disabled={pending || blocked}
            onClick={() => run("finalize")}
          >
            Finalize saved quotation
          </Button>
        )}
        {v.status === "draft" && v.current_revision === 0 && p.delete && (
          <Button
            type="button"
            variant="outline"
            disabled={pending || blocked}
            onClick={() => run("delete")}
          >
            Delete draft
          </Button>
        )}
        {["quoted", "sent", "rejected", "expired"].includes(v.status) &&
          p.update && (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => run("draft")}
            >
              Create new revision
            </Button>
          )}
        {v.status === "quoted" && p.finalize && (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run("sent")}
          >
            Mark as sent
          </Button>
        )}
        {["quoted", "sent"].includes(v.status) &&
          p.finalize &&
          ["accepted", "rejected", "expired"].map((s) => (
            <Button
              key={s}
              variant="outline"
              disabled={pending}
              onClick={() => run(s)}
            >
              Mark {s}
            </Button>
          ))}
      </div>
      {blocked && (
        <p className="text-sm text-muted-foreground">
          Save your changes before using quotation actions.
        </p>
      )}
      {pending && (
        <p role="status" className="text-sm">
          Updating quotation…
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {v.status === "accepted" && (
        <p className="text-sm text-muted-foreground">
          Accepted quotation is locked. Its immutable revision can support a
          future booking.
        </p>
      )}
    </section>
  );
}
