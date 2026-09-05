"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div role="alert" className="m-6 space-y-4 rounded-xl border p-6">
      <h2 className="text-lg font-semibold">
        Unable to load custom itineraries
      </h2>
      <p className="text-sm text-muted-foreground">
        Check your connection and confirm the custom-itinerary migration has
        been applied. Your saved data has not been changed.
      </p>
      <button onClick={reset} className="rounded-lg border px-4 py-3 text-sm">
        Try again
      </button>
    </div>
  );
}
