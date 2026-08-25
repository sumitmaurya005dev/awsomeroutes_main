# Awesome Routes Admin Portal

Internal, role-based portal for managing Awesome Routes travel content. It includes authentication, RBAC administration, media management, countries, regions, destinations, locations, and Activity catalogue/pricing.

## Local setup

1. Copy `.env.example` to `.env.local` and replace every placeholder.
2. Install dependencies with `npm ci`.
3. Link Supabase, preview migrations, apply them, and regenerate types:

   ```bash
   npx supabase login
   npx supabase link --project-ref yxmrthncsimieyoaakai
   npx supabase db push --dry-run --include-all
   npx supabase db push --include-all
   npx supabase gen types typescript --linked --schema public > src/types/database.types.ts
   ```

4. Run `npm run dev`.

Never commit `.env.local`, a Supabase secret/service-role key, or the ImageKit private key.

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
- Inactive users and temporary-password users are restricted by identity checks and the proxy.
- Admin pages emit no-index metadata and security headers.

Follow [the deployment checklist](docs/deployment-checklist.md) for production releases.
