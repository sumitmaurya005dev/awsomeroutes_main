# Personal-data flow map

This document describes the current admin portal. The future customer website is not part of this repository.

## Collection and lifecycle

| Data subject and data | Entry point | Server path | Storage and retention | Output or recipient | Deletion path |
|---|---|---|---|---|---|
| Portal user email and password | Login form (`src/app/page.tsx`) | `src/actions/auth/login.ts:12-43` | Password is handled only by Supabase Auth. The app stores neither plaintext nor a password hash. Email is also stored in `public.profiles` for administration. | Supabase Auth receives email/password over TLS. A Supabase session is returned in hardened cookies. | `deleteOwnAccount` deletes the Supabase Auth user; `profiles` cascades automatically. |
| Login IP address and email | Request headers and login form | `src/actions/auth/login.ts:22-34` | Raw values are not stored. An HMAC fingerprint is stored temporarily in `public.login_rate_limits`; a successful login deletes it. | Supabase Database receives only the HMAC fingerprint and counters. | Successful login deletes the row. Every recorded attempt also removes fingerprints not touched for 30 days. |
| Employee name, email, phone, role and status | Add/Edit User forms | `src/lib/rbac/admin.ts:8`, `src/lib/rbac/admin.ts:182-187` | Email is stored by Supabase Auth and `public.profiles`; name, phone, role and status are in `public.profiles`. | Authorized `users.view` screens receive the displayed identity fields. Phone and role ID are selected only for users with `users.update`. | Self-service account deletion removes Auth/profile identity. General audit `created_by` values become null. |
| Employee profile photo | Profile or User Management file input | `src/app/api/profile/avatar/route.ts:34-159` | Sanitized image is stored by ImageKit; its URL and private media record are stored in `media_assets`/`profiles`. Browser filename and user UUID are not sent as the remote filename. | ImageKit receives re-encoded pixels, an opaque filename, profile folder and a generic tag. EXIF/IPTC/XMP metadata is removed first. | Replacing a photo deletes the old ImageKit file and DB row. Account deletion removes all profile-folder assets before deleting Auth identity. |
| Customer name, email, phone, travel dates, group counts, notes and requested services | Custom Itinerary editor | `src/components/custom-itineraries/itinerary-builder.tsx:299-589` → `src/lib/custom-itineraries/actions.ts:51-92` | Current data is stored in `custom_itineraries` and its child tables. Finalization stores an immutable `document`, `calculation` and `source_snapshot` in `custom_itinerary_revisions`. | Supabase Database. Authorized portal users can preview it. PDF export is produced locally on the app server and downloaded to the authorized user's browser; no email service is called. | Never-finalized drafts can be deleted. Any quotation can be irreversibly anonymized: customer/contact/dates/notes and service details are removed, snapshots are reduced to non-identifying financial/audit facts. |
| Hotel business address, phone and email | Hotel create/edit form | `src/lib/hotels/validations.ts:32-36` → hotel mutation/RPC | `public.hotels` | Supabase Database and authorized Hotel Management users. Public users can read published address/map content but supplier-direct phone and email are explicitly withheld. No external hotel API exists. | Hotel lifecycle/delete controls; operational deletion may be blocked by package/rate references. |
| Vendor contact person, phone, alternate phone, email and address | Vehicle vendor form | `src/lib/vehicles/validations.ts:40-44` → vehicle mutations | `public.transport_vendors` | Supabase Database and authorized Vehicle Management users. | Vehicle delete controls; referenced vendors must first be reassigned. |
| Driver name, phone, alternate phone, licence number and licence-expiry date | Driver form | `src/lib/vehicles/validations.ts:51-56` → vehicle mutations | `public.drivers`; selected driver identity can appear in internal itinerary calculations. | Supabase Database and authorized Vehicle/Itinerary users. Driver phone/licence data is not included in customer PDFs. | Vehicle delete controls; referenced drivers must first be reassigned. |
| General uploaded image bytes and optional alt text | Media Library picker | `src/app/api/media/upload/route.ts:66-196` | Sanitized image in ImageKit; minimized metadata in `public.media_assets`. Original browser filename is discarded. | ImageKit receives re-encoded pixels, generated business filename and module folder. Supabase stores provider identifiers server-side. | Media lifecycle currently archives/reuses business assets. Profile assets have the stricter deletion flow above. |
| Expensive-operation usage | Media/avatar upload, PDF export, password/account actions, managed-user creation | `src/lib/security/feature-rate-limit.ts` | Only an HMAC fingerprint, operation scope, counter and window timestamps are stored in `feature_rate_limits`; rows inactive for 30 days are deleted. | Supabase Database; raw user IDs are not persisted in the limiter. | Automatic 30-day inactivity cleanup in the atomic limiter RPC. |

The application does **not** collect date of birth, payment-card/bank information, analytics identifiers, advertising identifiers, or device fingerprints. No analytics, error-tracking, payment, email, AI, advertising, Firebase, AWS, Twilio, SendGrid, Stripe or OpenAI SDK is integrated.

## Third-party recipients

| Recipient | Data sent | Data deliberately not sent | Control |
|---|---|---|---|
| Supabase Auth | Login/create/change/delete requests containing the minimum email/password or user ID required by the operation | Passwords are never inserted into application tables, logged, returned, or included in generated documents | Server actions, Supabase-hosted password hashing, active-profile checks and httpOnly session cookies |
| Supabase Database | Profiles, operational contacts, customer quotation data, RBAC, audit IDs and HMAC login-rate fingerprints | Raw login IP address, raw login fingerprint inputs and plaintext passwords | RLS, server permission checks, restricted service-role client and field-level selects |
| ImageKit | Sanitized image pixels, MIME type, opaque/generated filename, permitted folder and generic profile tag | Auth/session tokens, email, phone, raw user UUID in avatar filename, original browser filename, EXIF GPS/device metadata | Server-only private key, RBAC folder allowlist, MIME signature/size/pixel checks and server-side re-encoding |
| User's browser | Rendered authorized fields, hardened Supabase session cookie, downloaded quotation PDF | Service-role/ImageKit secrets, password hashes, raw provider responses | Server Components/actions, response field allowlists and private/no-store PDF headers |

`pdf-lib`, `fontkit`, React and Next.js run locally; they are libraries, not data recipients.

## Cookies and browser storage

- Supabase session cookies are explicitly `httpOnly`, `secure` in production, `sameSite=lax`, and scoped to `/` in `src/lib/supabase/server.ts` and `src/lib/supabase/middleware.ts`.
- No browser Supabase client remains, so JavaScript does not need access to authentication tokens.
- `sidebar_state` is a non-sensitive UI preference. It is `sameSite=lax` and `secure` in production, but intentionally not httpOnly because the sidebar component writes it.
- The app does not use `localStorage` or `sessionStorage`.

## Password handling

Passwords exist transiently only in password inputs and server-action arguments. They are sent directly to Supabase Auth for sign-in, user creation, reauthentication, or password change. No migration creates a password column in `public`, and no API or log returns a password. Hashing and credential storage are owned by Supabase Auth rather than this application database.

## Response minimization

- Media list/upload routes return only picker fields; ImageKit file IDs, provider paths, uploader IDs, original filenames and timestamps are not returned.
- Avatar upload returns only the new avatar URL.
- Region update returns only the updated region ID.
- User list queries do not select phone or role ID unless the caller can update users.
- Custom-itinerary lists do not select customer email and return only the final four phone digits; full data is loaded only on the permission-protected editor/export path.
- Quotation PDFs use `private, no-store`, disable indexing/archive, and require both view and export permissions.

## Erasure behavior and limits

- Employee self-deletion requires the current password plus an exact confirmation phrase. The final active Super Admin cannot delete their account.
- Auth identity/profile/profile photos are removed. Reusable business-media uploads are retained, but their `uploaded_by` reference becomes null. Other business records retain nullable anonymous audit authors so pricing and booking history is not corrupted.
- Customer erasure is initiated by a role with `custom_itineraries.delete`, requires an explicit `ANONYMIZE` confirmation, and cannot be reversed.
- Login rate-limit fingerprints are pseudonymous and are automatically removed after 30 days of inactivity.
- Feature-abuse fingerprints are likewise HMAC-pseudonymized and removed after 30 days of inactivity.
- Free-text fields can contain data staff entered outside their intended purpose. Staff should avoid placing unrelated personal data in hotel/vendor/driver notes or package content; customer anonymization clears the relevant itinerary notes and service snapshots.
