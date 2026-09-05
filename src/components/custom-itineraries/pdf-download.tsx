"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
export function PdfDownload({
  id,
  revision,
}: {
  id: string;
  revision: number;
}) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  async function download() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(
        "/api/custom-itineraries/" + id + "/pdf?revision=" + revision,
        { cache: "no-store" },
      );
      if (
        !response.ok ||
        !response.headers.get("content-type")?.includes("application/pdf")
      ) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error ??
            "Your session may have expired. Sign in and try again.",
        );
      }
      const url = URL.createObjectURL(await response.blob()),
        anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "quotation-" + id + "-r" + revision + ".pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "PDF download failed. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={download}
      >
        {pending ? "Preparing PDF…" : "Download revision " + revision + " PDF"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
