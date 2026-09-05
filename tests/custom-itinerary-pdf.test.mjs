import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { fixture } from "./fixtures/custom-itinerary.mjs";
import { makeQuoteDocument } from "../src/lib/custom-itineraries/document.ts";
import { calculateItinerary } from "../src/lib/custom-itineraries/pricing.ts";
import { renderQuotePdf } from "../src/lib/custom-itineraries/pdf.ts";
test("quotation PDF embeds INR font and paginates long content", async () => {
  const { value, refs } = fixture();
  value.terms = (
    "Terms and conditions apply to this journey. ".repeat(20) + "\n"
  ).repeat(12);
  const d = makeQuoteDocument(
    value,
    calculateItinerary(value, refs),
    refs,
    "2026-09-04",
  );
  const bytes = await renderQuotePdf(d),
    pdf = await PDFDocument.load(bytes);
  assert.ok(pdf.getPageCount() > 1);
  assert.ok(bytes.length > 10000);
  assert.equal(pdf.getTitle(), "Assam discovery");
  if (process.env.ITINERARY_QA_OUTPUT) {
    await mkdir(process.env.ITINERARY_QA_OUTPUT, { recursive: true });
    await writeFile(path.join(process.env.ITINERARY_QA_OUTPUT, "custom-itinerary-preview.pdf"), bytes);
  }
});
