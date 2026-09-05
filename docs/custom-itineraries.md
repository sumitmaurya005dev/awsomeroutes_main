# Custom itineraries / quotations

## Enable the module

1. Back up the linked database using your usual Supabase backup workflow.
2. From the project root, inspect pending migrations:

       npx supabase db push --include-all --dry-run

3. Apply the reviewed migrations:

       npx supabase db push --include-all

4. Refresh generated types without truncating the current file on CLI failure (PowerShell):

       $itineraryTypes = npx supabase gen types typescript --linked --schema public
       if ($LASTEXITCODE -eq 0 -and $itineraryTypes) {
         $itineraryTypes | Set-Content -LiteralPath "src/types/database.types.ts" -Encoding utf8
       } else {
         throw "Type generation failed; existing database.types.ts was preserved."
       }

5. Restart the app. Open **Custom Itineraries → Create Itinerary**.
6. Super admin receives the new permissions through the migration. Grant other roles access
   through Role Management. No extra browser-visible secret is needed.

## Workflow

- Start blank or use the visible import panel to copy a draft/published package for a
  selected hotel category. Import copies the current generated and customized package
  content while leaving customer details and the source package untouched.
- Package copying is a starting point: review room choices, guest allocation, optional
  activities and vehicle bands before saving. Source packages are not modified.
- Assign guests to hotel rooms for each overnight stay. Rate priority is room override,
  hotel override, then location default. Prices are per night; each stay belongs to one day.
- Activities support offering variants, unit counts, sessions and additional optional
  charges. Mandatory activity charges follow the existing pricing engine.
- Open the activity composer, select any location, and explicitly add searchable active
  offerings. Keep it open to add activities from multiple locations to the same day;
  location selection never auto-adds a service.
- Each day's calendar date follows the travel start date, including month/year changes.
- Vehicles use their booking-base rate across every allocated day, including rest days.
  Multiple cars, luggage-only vehicles and non-overlapping driver/fleet changes are supported.
- Vehicle +/− controls stay within existing itinerary days. Extend the day list first to
  extend billing; rest days remain chargeable.
- The final group total can be overridden with pricing permission and a mandatory internal
  reason. It stays fixed after service changes until cleared. Component rates are unchanged.
  Apply migration `20260904100000_custom_itinerary_total_override.sql` before using this feature.
- The customer preview at the end updates from the current draft without saving or finalizing.
  Internal notes and override reasons never appear there or in the customer PDF.
- Save the draft. Incomplete catalog selections must be corrected or removed; missing
  catalog prices/capacity warnings can remain in a saved draft but prevent finalization.
- Finalize the saved draft to create an immutable numbered quotation revision.
- Download a PDF from any saved revision. Marking a quote as sent only records status;
  it does not send email or WhatsApp.
- Reopen quoted/sent/rejected/expired quotations as a new draft revision. Existing
  quotation snapshots are never overwritten. Accepted quotations remain locked.
- Only never-finalized drafts can be deleted.

## Permissions and security

All module actions require an active profile, a completed temporary-password change
and custom_itineraries.view, plus the relevant permission:

| Permission | Ability |
| --- | --- |
| create | Create drafts; copy packages |
| update | Edit drafts; open a new revision |
| delete | Delete a never-finalized draft |
| manage_pricing | Set/change markup, discount, row overrides and final group total override |
| finalize | Finalize; record sent/accepted/rejected/expired status |
| export | Download quotation PDFs |

Permissions are read from role_permissions, not hardcoded manager/admin bypasses.
Users with module view access can see private quotation/customer details and catalog
pricing needed for quotation work. Do not give this permission to website customers.
The customer website must not query these tables anonymously.

Browser roles have read-only RLS access. Server actions use service-only transactional
RPCs that verify the session-derived actor again in PostgreSQL. Mutation RPCs cannot be
executed by anon/authenticated roles. Optimistic versions prevent lost updates.

PDFs are generated from the public snapshot allowlist, not from mutable catalog joins.
Internal notes, markup configuration and override reasons are excluded. PDF responses
are authenticated, non-cacheable and non-indexable. The font is bundled locally; there
are no remote font/image requests during export.

## Data model

- custom_itineraries: customer/header, group, dates, adjustment and status
- custom_itinerary_days: ordered day content and locations
- custom_itinerary_stays: concrete hotel/room and guest allocation
- custom_itinerary_activities: offering/variant and participant/session allocation
- custom_itinerary_activity_charges: optional-charge join table
- custom_itinerary_transport: vehicle quantity, date range, driver and fleet
- custom_itinerary_revisions: immutable public document, calculation and source snapshots
- custom_itinerary_events: server-recorded lifecycle history

Operational data is relational. JSON snapshots intentionally freeze quotation history.
Indexes cover listing/search and catalog foreign keys. No customer booking, payment,
inventory reservation or automated messaging is created by this module.

## Verification

    npm run verify

This includes pricing/validation/PDF tests and an isolated PostgreSQL (PGlite)
migration test with fixture catalog tables. It does not write to live Supabase.
It verifies transaction rollback, permission denial, inactive/temporary-password RLS,
read access, stale versions, quote lifecycle and immutable revisions.

Browser component testing (requires a production build for styles):

    npm run build
    npx playwright install chromium
    npm run test:itinerary:ui

On Windows with Chrome already installed, instead of installing Chromium:

    $env:PLAYWRIGHT_CHANNEL = "chrome"
    npm run test:itinerary:ui

Browser tests run actual form components with mock server actions. They do not replace
the live post-migration smoke test: create → save → reload → finalize → PDF → new revision.
Also test with a view-only account and an inactive account.

## Current limits

- Up to 60 days, 100 guests and 60 transport allocations per itinerary.
- Draft payloads above 750 KB are rejected with a shortening/splitting message before
  they reach the framework action limit.
- Year-round catalog rates; no seasonal/dynamic availability or actual reservations.
- Each hotel stay requires at least one adult; child/infant policies follow
  the selected rate/room. Hotel age bands are 0–4, 5–11 and 12+.
- PDF text currently uses Latin-script Noto Sans with INR support. Unsupported script
  characters cause a clear export error instead of missing-glyph boxes.
- Catalog references are paginated on the server before loading the editor. Above
  20,000 active records per catalog, server-side search should replace bulk loading.
- Role grants, full Supabase schema compatibility and authenticated end-to-end
  operation must be confirmed after applying the migration to the real project.
- npm audit at implementation time reported no production dependency findings;
  one moderate development-only qs advisory remains in pre-existing tooling.
