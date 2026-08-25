# Production deployment checklist

## Before deployment

- [ ] Review and merge only the intended branch changes.
- [ ] Run `npm ci`, `npm run verify`, `npm audit --omit=dev`, and `git diff --check`.
- [ ] Run `npx supabase db push --dry-run --include-all` against the intended project.
- [ ] Back up the production database before structural migrations.
- [ ] Apply migrations and regenerate `src/types/database.types.ts` from the linked project.
- [ ] Confirm RLS is enabled and anon access exposes only active public catalogue columns.
- [ ] Confirm Super Admin permission synchronization and test one restricted employee role.
- [ ] Configure the exact production environment variables from `.env.example`.
- [ ] Confirm secret keys exist only in server runtime settings.
- [ ] Configure error tracking and uptime monitoring for `/api/health` in the hosting provider.

## Smoke tests

- [ ] Active user can log in; inactive user cannot access protected routes or APIs.
- [ ] Temporary-password user is forced to Profile until the password is changed.
- [ ] Removing a role permission hides navigation and forbids its URL/action.
- [ ] Dependency deletes show a useful message.
- [ ] Shared images work while profile avatars remain outside the Media Library.
- [ ] Activity master data, gallery, pricing rules, slots, and FAQs save correctly.
- [ ] A user without `activities.override_price` cannot set or clear overrides.
- [ ] Verify mobile navigation and keyboard-accessible dialogs.

## After deployment

- [ ] Check `/api/health`, authentication, admin routes, and ImageKit upload.
- [ ] Inspect error logs and database performance for at least 30 minutes.
- [ ] Confirm security, private-cache, and `X-Robots-Tag` response headers.
- [ ] Record the deployed commit and migration versions.
