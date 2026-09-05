// Isolated real-browser component test. Server actions are deterministic mocks;
// PostgreSQL/RBAC are covered separately. No live customer data or remote DB writes.
import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readdir, readFile, mkdir } from "node:fs/promises";
import path from "node:path";
const mockActions =
  "export async function saveCustomItinerary(v){window.__saved=v;return {success:true,data:{id:v.id,version:v.version+1}};} export async function clonePackageIntoItinerary(packageId){window.__importedPackage=packageId;const f=window.__fixture;return {success:true,data:{title:'Imported Assam package',source_package_id:packageId,days:structuredClone(f.value.days),transport:structuredClone(f.value.transport),terms:'Imported package terms'}};} export async function finalizeCustomItinerary(){window.__finalized=true;return {success:true,data:1};} export async function changeCustomItineraryStatus(){return {success:true,data:null};} export async function deleteCustomItinerary(){return {success:true,data:null};}";
test("browser: day controls, searchable selects, save, permission visibility and mobile layout", async () => {
  const entry =
    "import React from 'react';import {createRoot} from 'react-dom/client';import {ItineraryBuilder} from './src/components/custom-itineraries/itinerary-builder';import {fixture} from './tests/fixtures/custom-itinerary.mjs';const f=fixture();const params=new URLSearchParams(location.search),readonly=params.has('readonly'),creating=params.has('create');f.value.version=creating?0:1;const p={view:true,create:!readonly,update:!readonly,delete:!readonly,pricing:!readonly,finalize:!readonly,export:!readonly};window.__fixture=f;createRoot(document.getElementById('root')).render(<main style={{maxWidth:1400,margin:'auto',padding:24}}><h1 className='mb-6 text-2xl font-semibold'>Custom itinerary</h1><ItineraryBuilder initial={f.value} detail={creating?undefined:f.value} refs={f.refs} permissions={p} templates={[{id:f.ids.model,name:'Assam Explorer',duration_days:7}]}/></main>);";
  const bundle = await build({
    stdin: { contents: entry, resolveDir: process.cwd(), loader: "tsx" },
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"development"' },
    plugins: [
      {
        name: "test-boundaries",
        setup(b) {
          b.onResolve({ filter: /^next\/(navigation|link)$/ }, (a) => ({
            path: a.path,
            namespace: "mocks",
          }));
          b.onResolve(
            { filter: /^@\/lib\/custom-itineraries\/actions$/ },
            () => ({ path: "actions", namespace: "mocks" }),
          );
          b.onLoad({ filter: /.*/, namespace: "mocks" }, (a) => ({
            contents:
              a.path === "actions"
                ? mockActions
                : a.path === "next/link"
                  ? "import React from 'react';export default function Link({children,href,onClick,className}){return React.createElement('a',{href,onClick,className},children)}"
                  : "export function useRouter(){return {replace(){},push(){},refresh(){}}}",
            loader: "js",
            resolveDir: process.cwd(),
          }));
        },
      },
    ],
  });
  const chunks = path.join(process.cwd(), ".next/static/chunks");
  const styles = (
    await Promise.all(
      (await readdir(chunks))
        .filter((x) => x.endsWith(".css"))
        .map((x) => readFile(path.join(chunks, x), "utf8")),
    )
  ).join("\n");
  const server = createServer((req, res) => {
    res.setHeader(
      "Content-Type",
      req.url === "/app.js" ? "text/javascript" : "text/html",
    );
    res.end(
      req.url === "/app.js"
        ? bundle.outputFiles[0].text
        : '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>' +
            styles +
            '</style></head><body><div id="root"></div><script src="/app.js"></script></body></html>',
    );
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      ...(process.env.PLAYWRIGHT_CHANNEL
        ? { channel: process.env.PLAYWRIGHT_CHANNEL }
        : {}),
    });
    const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) => d.accept());
    const url = "http://127.0.0.1:" + server.address().port;
    await page.goto(url);
    await page
      .getByRole("button", { name: "Save draft", exact: true })
      .waitFor();
    assert.equal(
      await page.getByRole("heading", { name: "Day 1", exact: true }).count(),
      1,
    );
    await page
      .getByLabel("Customer name", { exact: false })
      .fill("Updated Guest");
    assert.equal(
      await page
        .getByRole("button", { name: "Finalize saved quotation" })
        .isDisabled(),
      true,
    );
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await page.waitForFunction(
      () => window.__saved?.customer_name === "Updated Guest",
    );
    await expect(
      page.getByRole("button", { name: "Finalize saved quotation" }),
    ).toBeEnabled();
    await expect(
      page.getByRole("heading", { name: /Jeep Safari/ }).first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Add day", exact: true }).click();
    assert.equal(
      await page.getByRole("heading", { name: "Day 2", exact: true }).count(),
      1,
    );
    const second = page.locator("article").filter({
      has: page.getByRole("heading", { name: "Day 2", exact: true }),
    });
    await expect(
      second.getByText("No activity selected for this day."),
    ).toBeVisible();
    await second
      .getByRole("button", { name: "Search and add activity" })
      .click();
    await expect(
      second.getByText("Select a location before searching activities."),
    ).toBeVisible();
    await second.getByText("Select activity location", { exact: true }).click();
    await page.getByRole("combobox").fill("Kaziranga");
    await page.getByRole("combobox").press("Enter");
    await expect(
      second.getByRole("button").filter({ hasText: "River Cruise" }),
    ).toHaveCount(0);
    await expect(
      second.getByRole("button", { name: /Jeep Safari/ }),
    ).toBeVisible();
    await expect(second.getByRole("button", { pressed: true })).toHaveCount(0);
    // Location selection only exposes results; it must not add or price one.
    await expect(
      second.getByText("No activity selected for this day."),
    ).toBeVisible();
    const draftResult = second.getByRole("button", { name: /Draft Safari/ });
    await expect(draftResult).toBeVisible();
    await expect(draftResult).toBeDisabled();
    await expect(
      second.getByText("Activity is draft. Activate it first."),
    ).toBeVisible();
    await expect(
      second.getByRole("link", { name: "Open activity settings" }),
    ).toBeVisible();
    await second.getByLabel("Search activities at this location").fill("Jeep");
    await second
      .getByRole("button", { name: /Add Jeep Safari to day/ })
      .click();
    await expect(
      second.getByRole("button", { name: /Jeep Safari/ }),
    ).toHaveAttribute("aria-pressed", "true");
    // Explicit Add immediately creates the row and updates live costing.
    await expect(
      second.getByText("No activity selected for this day."),
    ).toHaveCount(0);
    await expect(
      second.getByRole("heading", { name: /Jeep Safari/ }),
    ).toBeVisible();
    const liveCosting = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Live costing · entire group" }),
    });
    await expect(liveCosting).toContainText("Day 2 · Jeep Safari");
    await expect(liveCosting).toContainText("₹3,230");
    await expect(
      second.getByText("Choose another location or activity to add more.", {
        exact: false,
      }),
    ).toBeVisible();
    // Keep Jeep selected and add an activity from another location to the same day.
    await second.getByRole("button", { name: "Activity location" }).click();
    await page.getByRole("combobox").fill("Guwahati");
    await page.getByRole("combobox").press("Enter");
    await expect(
      second.getByRole("button").filter({ hasText: "Jeep Safari" }),
    ).toHaveCount(0);
    await expect(
      second.getByLabel("Search activities at this location"),
    ).toHaveValue("");
    await second
      .getByRole("button", { name: /Add River Cruise to day/ })
      .click();
    await expect(
      second.getByRole("heading", { name: /River Cruise/ }),
    ).toBeVisible();
    await expect(
      second.getByRole("button", { name: "Remove activity" }),
    ).toHaveCount(2);
    await expect(
      second.getByText("No activity selected for this day."),
    ).toHaveCount(0);
    await second
      .getByRole("button", { name: /Remove River Cruise from day/ })
      .click();
    await expect(
      second.getByRole("heading", { name: /Jeep Safari/ }),
    ).toBeVisible();
    await expect(
      second.getByRole("button", { name: "Remove activity" }),
    ).toHaveCount(1);
    await expect(liveCosting).not.toContainText("Day 2 · River Cruise");
    await second
      .getByRole("button", { name: /Add River Cruise to day/ })
      .click();
    await second
      .getByRole("button", { name: "Done adding activities" })
      .click();
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await page.waitForFunction(() =>
      window.__saved?.days?.[1]?.activities?.some(
        (activity) =>
          activity.offering_id ===
          window.__fixture.refs.activity_offerings[1].id,
      ),
    );
    assert.equal(
      await page.evaluate(() => window.__saved.days[1].activities.length),
      2,
      "one day keeps explicitly added activities from both locations",
    );
    assert.equal(
      await page.evaluate(() => {
        const offerings = window.__fixture.refs.activity_offerings;
        const selected = window.__saved.days[1].activities.map((activity) =>
          offerings.find((offering) => offering.id === activity.offering_id),
        );
        return new Set(selected.map((offering) => offering.location_id)).size;
      }),
      2,
    );
    assert.equal(
      await page.evaluate(
        () => window.__saved.days[1].activities[0].variant_id,
      ),
      null,
    );
    // Date recalculation, inclusive day steppers and final override/preview use real UI events.
    await page.getByLabel("Travel start date").fill("2028-02-28");
    await expect(
      second.getByText("Tue, 29 Feb, 2028", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Increase through day (inclusive)" })
      .click();
    await expect(
      page.getByLabel("Through day (inclusive)", { exact: true }),
    ).toHaveValue("2");
    await expect(
      page.getByRole("button", { name: "Increase through day (inclusive)" }),
    ).toBeDisabled();
    await page
      .getByRole("button", { name: "Decrease through day (inclusive)" })
      .click();
    await expect(
      page.getByLabel("Through day (inclusive)", { exact: true }),
    ).toHaveValue("1");
    await page
      .getByRole("button", { name: "Increase from day (inclusive)" })
      .click();
    await expect(
      page.getByLabel("From day (inclusive)", { exact: true }),
    ).toHaveValue("2");
    await expect(
      page.getByLabel("Through day (inclusive)", { exact: true }),
    ).toHaveValue("2");
    await page
      .getByRole("button", { name: "Decrease from day (inclusive)" })
      .click();
    await page
      .getByLabel("Final group total (INR)", { exact: false })
      .fill("12000");
    await page
      .getByLabel("Final price override reason", { exact: false })
      .fill("PRIVATE DISCOUNT REASON");
    await page
      .getByRole("button", { name: "Preview itinerary", exact: true })
      .click();
    const preview = page.locator("#itinerary-customer-preview");
    await expect(preview).toContainText("₹12,000.00");
    await expect(preview).toContainText("29 Feb, 2028");
    await expect(preview).not.toContainText("PRIVATE DISCOUNT REASON");
    await expect(preview).not.toContainText("PRIVATE INTERNAL NOTE");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await page.waitForFunction(
      () => window.__saved?.total_override_paise === 1200000,
    );
    await page
      .getByRole("button", { name: "Use calculated total", exact: true })
      .click();
    await expect(
      page.getByLabel("Final group total (INR)", { exact: false }),
    ).toHaveValue("");
    await second
      .getByRole("button", { name: "Search and add activity" })
      .click();
    await second.getByText("Select activity location", { exact: true }).click();
    await page.getByRole("combobox").fill("Tezpur");
    await page.getByRole("combobox").press("Enter");
    await expect(
      second.getByText("No activity is configured for this location.", {
        exact: false,
      }),
    ).toBeVisible();
    await second
      .getByRole("button", { name: "Done adding activities", exact: true })
      .click();
    await second
      .getByRole("button", { name: "Remove activity", exact: true })
      .last()
      .click();
    await second
      .getByRole("button", { name: "Remove day", exact: true })
      .click();
    assert.equal(
      await page.getByRole("heading", { name: "Day 2", exact: true }).count(),
      0,
    );
    // Recreate a vehicle row and exercise its remove control.
    await page
      .getByRole("button", { name: "Add vehicle allocation", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("button", { name: "Remove vehicle", exact: true })
        .count(),
      1,
    );
    await page
      .getByRole("button", { name: "Remove vehicle", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Add hotel stay", exact: true })
      .click();
    assert.equal(
      await page.getByRole("heading", { name: "Stay 2", exact: true }).count(),
      1,
    );
    await page
      .getByRole("button", { name: "Remove stay", exact: true })
      .last()
      .click();
    const out = process.env.ITINERARY_QA_OUTPUT;
    if (out) {
      await mkdir(out, { recursive: true });
      await page.screenshot({
        path: path.join(out, "itinerary-desktop.png"),
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 375, height: 812 });
    await page.evaluate(() => scrollTo(0, 0));
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      "mobile viewport must not overflow",
    );
    if (out)
      await page.screenshot({
        path: path.join(out, "itinerary-mobile.png"),
        fullPage: true,
      });
    await page.goto(url + "?readonly");
    await page.getByText("Read-only access.", { exact: false }).waitFor();
    await expect(
      page.getByLabel("Final group total (INR)", { exact: false }),
    ).toBeDisabled();
    assert.equal(
      await page
        .getByRole("button", { name: "Save draft", exact: true })
        .count(),
      0,
    );
    assert.equal(
      await page.getByLabel("Customer name", { exact: false }).isDisabled(),
      true,
    );
    assert.equal(
      await page
        .getByText("Price override (optional)", { exact: true })
        .count(),
      0,
    );
    // New quotes expose package import without a collapsed/hidden panel.
    await page.goto(url + "?create");
    await expect(
      page.getByRole("heading", {
        name: "Import an existing package (optional)",
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Package", exact: true }).click();
    await page.getByRole("combobox").fill("Assam Explorer");
    await page.getByRole("combobox").press("Enter");
    await page
      .getByRole("button", { name: "Hotel category", exact: true })
      .click();
    await page.getByRole("combobox").fill("Comfort");
    await page.getByRole("combobox").press("Enter");
    await page
      .getByRole("button", { name: "Import selected package", exact: true })
      .click();
    await expect(page.getByLabel("Itinerary title")).toHaveValue(
      "Imported Assam package",
    );
    await expect(page.getByLabel("Customer name")).toHaveValue("Sample Guest");
    await expect(page.getByRole("heading", { name: "Day 1" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Jeep Safari/ }),
    ).toBeVisible();
    assert.equal(
      await page.evaluate(
        () => window.__importedPackage === window.__fixture.ids.model,
      ),
      true,
    );
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    await new Promise((r) => server.close(r));
  }
});
