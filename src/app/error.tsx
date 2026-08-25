"use client";

import { useEffect } from "react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Application error", { error, digest: error.digest });
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-md rounded-2xl border bg-background p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your data was not changed. Check your connection and try again.</p>
        <button className="mt-6 rounded-lg bg-primary px-4 py-2 text-primary-foreground" onClick={reset}>Try again</button>
      </section>
    </main>
  );
}
