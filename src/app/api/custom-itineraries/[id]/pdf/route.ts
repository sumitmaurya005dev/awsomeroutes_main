import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  itineraryPermissions,
  itineraryDatabase,
} from "@/lib/custom-itineraries/queries";
import { renderQuotePdf } from "@/lib/custom-itineraries/pdf";
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
    console.error(
      "Quotation PDF export failed",
      e instanceof Error ? e.message : "Database error",
    );
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
