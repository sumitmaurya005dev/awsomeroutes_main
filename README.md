# Awesome Routes Admin Portal

Internal, role-based portal for managing Awesome Routes travel content. It includes authentication, RBAC administration, media management, destinations, activities, hotels, vehicles, packages, and custom itineraries.

## Local setup

1. Copy `.env.example` to `.env.local` and replace every placeholder.
2. Install dependencies with `npm ci`.
3. Link Supabase, preview migrations, apply them, and regenerate types:

   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push --dry-run --include-all
   npx supabase db push --include-all
   npx supabase gen types typescript --linked --schema public > src/types/database.types.ts
   ```

4. Run `npm run dev`.

### Environment variables

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser-safe | Supabase project API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe only with RLS | Supabase publishable key used by SSR and browser clients |
| `SUPABASE_SECRET_KEY` | Server-only | Privileged Supabase administration; never prefix with `NEXT_PUBLIC_` |
| `IMAGEKIT_PRIVATE_KEY` | Server-only | Authenticated ImageKit upload and deletion requests |
| `APP_ORIGIN` | Server-only | Exact trusted admin origin, such as `https://portal.awesomeroutes.com` |
| `ITINERARY_QA_OUTPUT` | Local test only | Optional directory for itinerary QA artifacts |
| `PLAYWRIGHT_CHANNEL` | Local test only | Optional browser channel for UI tests |

Only the two explicitly documented `NEXT_PUBLIC_` values may enter the browser bundle. Never commit `.env.local`, a Supabase secret key, or the ImageKit private key. Configure server-only variables in the deployment provider and scope them to the required environments.

### Credential rotation warning

Git retains values in earlier commits even after a file is edited or deleted. Before launch, immediately rotate any credential that was ever hardcoded, committed, pasted into documentation, exposed in logs, or shared outside the approved secret store. Updating the current file is not sufficient; revoke the old value at its provider and replace the deployment environment variable. This repository audit covers the current tree, not every historical Git object.

## Quality gate

Before merging, run:

```bash
npm run verify
npm audit --omit=dev
git diff --check
```

Database migrations are part of the application contract. Do not deploy code that uses a new RPC before its migration succeeds.

## Security model

- UI visibility is only a convenience; server actions, API routes, and Supabase RLS enforce authorization.
- Super Admin receives every permission; other roles use explicit `role_permissions` mappings.
- Profile avatars are private and excluded from the shared Media Library.
- Generic browser-to-ImageKit authentication is disabled; uploads pass through an authorized server route.
- Privileged Supabase access is isolated behind a `server-only` module and uses only `SUPABASE_SECRET_KEY`.
- Every public table is required to have Row Level Security enabled; the security regression test checks migration coverage.
- Inactive users and temporary-password users are restricted by identity checks and the proxy.
- Admin pages emit no-index metadata and security headers.
- Startup fails closed when a required environment variable is missing, a placeholder is used, or a production URL is not HTTPS.
- Unsafe cross-origin requests are rejected; private APIs do not emit wildcard CORS headers.
- Every proxied response includes a correlation ID. API failures return generic messages and server logs contain only redacted diagnostic metadata keyed by that ID.
- Production CSP uses per-request nonces and does not allow inline scripts; HSTS is one year.
- Login throttling is IP-based at five failed attempts per minute. No public signup, password-reset, or OTP endpoint is currently exposed.
- Expensive authenticated operations use atomic, server-only database buckets;
  concurrent uploads cannot race a count-then-insert quota check.
- Catalog image URLs are derived from selected public Media Library rows;
  private profile assets and arbitrary client-provided URLs cannot be attached.

Follow [the deployment checklist](docs/deployment-checklist.md) for production releases.

The repository's collection points, storage locations, third-party disclosures,
response minimization, and erasure behavior are documented in the
[personal-data flow map](docs/PRIVACY_DATA_FLOW.md).
