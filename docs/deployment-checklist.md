# Production deployment checklist

## Before deployment

- [ ] Review and merge only the intended branch changes.
- [ ] Run `npm ci`, `npm run verify`, `npm audit --omit=dev`, and `git diff --check`.
- [ ] Run `npx supabase db push --dry-run --include-all` against the intended project.
- [ ] Back up the production database before structural migrations.
- [ ] Apply migrations and regenerate `src/types/database.types.ts` from the linked project.
- [ ] Confirm RLS is enabled and anon access exposes only active public catalogue columns.
- [ ] Confirm Super Admin permission synchronization and test one restricted employee role.
- [ ] Apply `20260907110000_revoked_auth_sessions.sql`; log in, copy the current
      session ID, log out, and confirm the old session receives `401` immediately.
- [ ] Apply `20260907120000_feature_abuse_rate_limits.sql`; verify the Media
      Library, avatar upload, quotation PDF export, password change/account
      deletion, and managed-user creation limits return `429` or a safe
      unavailable response when their server-only limiter denies a request.
- [ ] In Supabase **Authentication > Sessions**, use an asymmetric JWT signing
      key and set the access-token lifetime to 15 minutes for this admin portal
      (never exceed one hour without a documented risk decision).
- [ ] Password recovery is intentionally not exposed by this app. If it is
      enabled later, keep Supabase-managed random, user-bound, single-use
      recovery tokens; set Email OTP expiry to **900 seconds**, add CAPTCHA,
      enforce **3 requests/hour/IP**, use PKCE, and return the same response for
      registered and unknown email addresses.
- [ ] Configure the exact production environment variables from `.env.example`.
- [ ] Set `APP_ORIGIN=https://portal.awesomeroutes.com` in Production and use the exact preview origin only in an isolated preview environment.
- [ ] Confirm secret keys exist only in server runtime settings.
- [ ] Confirm the Supabase project URL is HTTPS, database access requires authentication, no direct PostgreSQL port is exposed by the deployment, and all migrations/RLS policies are applied.
- [ ] Configure error tracking and uptime monitoring for `/api/health` in the hosting provider.

## Smoke tests

- [ ] Active user can log in; inactive user cannot access protected routes or APIs.
- [ ] Temporary-password user is forced to Profile until the password is changed.
- [ ] Removing a role permission hides navigation and forbids its URL/action.
- [ ] A user manager cannot edit/deactivate an account whose current role has
      permissions the manager does not have; likewise, a role editor cannot
      open or save a higher-privileged role.
- [ ] A module create/update/pricing permission without its matching `view`
      permission cannot load existing hotel or package edit pages.
- [ ] Dependency deletes show a useful message.
- [ ] Shared images work while profile avatars remain outside the Media Library.
- [ ] A forged catalog form cannot bind an arbitrary URL or a private profile
      asset; the saved URL must come from the selected public Media Library row.
- [ ] Activity master data, gallery, pricing rules, slots, and FAQs save correctly.
- [ ] A user without `activities.override_price` cannot set or clear overrides.
- [ ] Verify mobile navigation and keyboard-accessible dialogs.

## After deployment

- [ ] Check `/api/health`, authentication, admin routes, and ImageKit upload.
- [ ] Inspect error logs and database performance for at least 30 minutes.
- [ ] Confirm security, private-cache, and `X-Robots-Tag` response headers.
- [ ] Confirm `Content-Security-Policy` contains a per-request nonce, `X-Correlation-ID` changes between requests, and cross-origin mutation requests receive `403`.
- [ ] Record the deployed commit and migration versions.
