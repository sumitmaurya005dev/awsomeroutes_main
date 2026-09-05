import { PDFDocument, rgb } from "pdf-lib";
import type { PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { QuoteDocument } from "../../types/custom-itinerary";
const ink = rgb(0.1, 0.15, 0.08),
  muted = rgb(0.36, 0.4, 0.34),
  accent = rgb(0.76, 0.87, 0.36),
  paper = rgb(0.96, 0.97, 0.94);
const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(n / 100);
export async function renderQuotePdf(d: QuoteDocument): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(
    await readFile(
      path.join(process.cwd(), "assets/fonts/NotoSans-Regular.ttf"),
    ),
    { subset: true },
  );
  const supported = new Set(font.getCharacterSet());
  // Refuse unsupported glyphs rather than silently exporting missing-character boxes.
  const safe = (s: string) => {
    const value = s
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
      .replace(/[–—‑]/g, "-")
      .replace(/→/g, "to");
    for (const char of value) {
      if (
        char !== "\n" &&
        char !== "\r" &&
        char !== "\t" &&
        !supported.has(char.codePointAt(0)!)
      )
        throw new Error(
          "This quotation contains characters not supported by the PDF font. Use Latin-script text for this export.",
        );
    }
    return value;
  };
  pdf.setTitle(d.title);
  pdf.setAuthor("Awesomeroutes");
  pdf.setSubject(d.reference + " revision " + d.revision);
  let page = pdf.addPage([595.28, 841.89]),
    y = 755;
  const width = 499.28;
  function header() {
    page.drawRectangle({ x: 0, y: 806, width: 595.28, height: 36, color: ink });
    page.drawText("AWESOMEROUTES  /  YOUR PRIVATE JOURNEY", {
      x: 48,
      y: 819,
      size: 9,
      font,
      color: rgb(1, 1, 1),
    });
  }
  header();
  function fresh() {
    page = pdf.addPage([595.28, 841.89]);
    y = 768;
    header();
  }
  function room(height: number) {
    if (y - height < 62) fresh();
  }
  function lines(text: string, size: number, f: PDFFont = font) {
    const result: string[] = [];
    for (const paragraph of safe(text).replace(/\r/g, "").split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        if (!word) continue;
        if (f.widthOfTextAtSize(word, size) > width) {
          if (line) {
            result.push(line);
            line = "";
          }
          for (const char of word) {
            if (f.widthOfTextAtSize(line + char, size) > width) {
              result.push(line);
              line = "";
            }
            line += char;
          }
        } else if (
          line &&
          f.widthOfTextAtSize(line + " " + word, size) > width
        ) {
          result.push(line);
          line = word;
        } else line += (line ? " " : "") + word;
      }
      result.push(line);
    }
    return result;
  }
  function text(value: string, size = 10, color = ink, after = 7) {
    for (const line of lines(value, size)) {
      room(size * 1.55);
      if (line) page.drawText(line, { x: 48, y, size, font, color });
      y -= size * 1.55;
    }
    y -= after;
  }
  function heading(value: string) {
    room(62);
    y -= 8;
    page.drawRectangle({ x: 48, y: y - 7, width, height: 1, color: accent });
    y -= 29;
    text(value, 14, ink, 6);
  }
  text(d.reference + "  |  REVISION " + d.revision, 10, muted, 10);
  text(d.title, 25, ink, 12);
  text("Prepared for " + d.customer_name, 12);
  text(
    [d.customer_email, d.customer_phone].filter(Boolean).join("  |  "),
    9,
    muted,
  );
  text(
    "Travel starts " +
      d.travel_date +
      "  |  Quotation valid until " +
      d.valid_until,
    10,
    muted,
  );
  text(d.guests, 10, muted, 16);
  for (const day of d.days) {
    heading("DAY " + day.day_number + "  /  " + day.title);
    if (day.date) text(day.date);
    if (day.route) text(day.route, 11, ink);
    const distance = [
      day.distance_km !== null ? day.distance_km + " km" : "",
      day.travel_minutes !== null ? day.travel_minutes + " minutes" : "",
    ]
      .filter(Boolean)
      .join("  |  ");
    if (distance) text(distance, 9, muted);
    if (day.description) text(day.description);
    if (day.overnight) text("Overnight: " + day.overnight, 10);
    if (day.meals) text("Meals included: " + day.meals, 10);
    for (const service of day.services) {
      room(48);
      text(
        service.label +
          (service.optional ? " (optional - excluded from total)" : ""),
        10,
        ink,
        1,
      );
      text(service.detail, 9, muted, 8);
    }
  }
  heading("QUOTATION  /  ENTIRE GROUP");
  for (const cost of d.costs)
    text(cost.label + "  -  " + money(cost.amount_paise), 11);
  if (d.costs.length)
    text(
      "Selected component costs are shown for reference. The final group total includes quotation adjustments.",
      9,
      muted,
    );
  room(85);
  page.drawRectangle({
    x: 38,
    y: y - 43,
    width: 519.28,
    height: 58,
    color: paper,
  });
  text("Group total: " + money(d.total_paise), 20, ink, 16);
  text(
    "Advance requested: " +
      money(d.advance_paise) +
      "  |  Balance: " +
      money(d.balance_paise),
    10,
  );
  if (d.public_notes) {
    heading("NOTES");
    text(d.public_notes);
  }
  if (d.terms) {
    heading("INCLUSIONS, EXCLUSIONS & TERMS");
    text(d.terms);
  }
  const pages = pdf.getPages();
  for (const [index, p] of pages.entries()) {
    p.drawLine({
      start: { x: 48, y: 48 },
      end: { x: 547, y: 48 },
      thickness: 0.5,
      color: muted,
    });
    p.drawText(
      d.reference +
        " / R" +
        d.revision +
        "  ·  Prepared " +
        d.issued_at.slice(0, 10),
      { x: 48, y: 31, size: 8, font, color: muted },
    );
    p.drawText(index + 1 + " / " + pages.length, {
      x: 509,
      y: 31,
      size: 8,
      font,
      color: muted,
    });
  }
  return pdf.save();
}
