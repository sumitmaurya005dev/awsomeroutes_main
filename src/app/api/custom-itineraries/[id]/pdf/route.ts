import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  itineraryPermissions,
  itineraryDatabase,
} from "@/lib/custom-itineraries/queries";
import { renderQuotePdf } from "@/lib/custom-itineraries/pdf";
import { logServerError } from "@/lib/security/log-server-error";
import { getCorrelationId } from "@/lib/security/request-security";
import { consumeFeatureRateLimit } from "@/lib/security/feature-rate-limit";
import type { QuoteDocument } from "@/types/custom-itinerary";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const correlationId = getCorrelationId(request);
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword)
    return Response.json(
      { error: "Authentication required." },
      { status: 401, headers: privateHeaders },
    );
  const p = await itineraryPermissions();
  if (!p.view || !p.export)
    return Response.json(
      { error: "Quotation export permission required." },
      { status: 403, headers: privateHeaders },
    );
  const quota = await consumeFeatureRateLimit({
    scope: "quotation-pdf-export",
    subject: user.id,
    limit: 30,
    windowSeconds: 60 * 60,
  }).catch(() => null);
  if (!quota)
    return Response.json(
      { error: "Quotation export is temporarily unavailable." },
      { status: 503, headers: privateHeaders },
    );
  if (!quota.allowed)
    return Response.json(
      { error: "Hourly quotation export limit reached." },
      {
        status: 429,
        headers: {
          ...privateHeaders,
          "Retry-After": String(quota.retryAfterSeconds),
        },
      },
    );
  const { id } = await params,
    revision = Number(new URL(request.url).searchParams.get("revision"));
  if (
    !z.uuid().safeParse(id).success ||
    !Number.isSafeInteger(revision) ||
    revision < 1
  )
    return Response.json(
      { error: "Invalid quotation or revision." },
      { status: 400, headers: privateHeaders },
    );
  try {
    const db = await itineraryDatabase("export");
    const { data, error } = await db
      .from("custom_itinerary_revisions")
      .select("document")
      .eq("itinerary_id", id)
      .eq("revision", revision)
      .maybeSingle();
    if (error) throw error;
    if (!data)
      return Response.json(
        { error: "Quotation revision not found." },
        { status: 404, headers: privateHeaders },
      );
    const bytes = await renderQuotePdf(data.document as QuoteDocument);
    return new Response(new Uint8Array(bytes), {
      headers: {
        ...privateHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="quotation-' + id + "-r" + revision + '.pdf"',
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    logServerError("Quotation PDF export failed.", e, correlationId);
    return Response.json(
      {
        error:
          e instanceof Error && e.message.startsWith("This quotation contains")
            ? e.message
            : "Could not export this quotation. Please try again.",
      },
      { status: 500, headers: privateHeaders },
    );
  }
}
