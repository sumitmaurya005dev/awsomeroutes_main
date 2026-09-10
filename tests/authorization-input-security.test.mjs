import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import test from "node:test";
import { getVerifiedSessionTokenMetadata } from "../src/lib/auth/session-token.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function sourceText(directory) {
  return readdirSync(path.join(root, directory), { withFileTypes: true })
    .flatMap((entry) => {
      const relative = path.join(directory, entry.name);
      if (entry.isDirectory()) return sourceText(relative);
      return /\.(?:ts|tsx|js|jsx)$/.test(entry.name)
        ? [readFileSync(path.join(root, relative), "utf8")]
        : [];
    });
}

function token(payload) {
  const segment = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${segment}.signature`;
}

test("session metadata accepts only UUID-bound expiring tokens", () => {
  const sessionId = "123e4567-e89b-42d3-a456-426614174000";
  assert.deepEqual(
    getVerifiedSessionTokenMetadata(token({ session_id: sessionId, exp: 2_000_000_000 })),
    { sessionId, expiresAt: new Date(2_000_000_000_000) },
  );
  assert.equal(getVerifiedSessionTokenMetadata(token({ session_id: "attacker", exp: 2_000_000_000 })), null);
  assert.equal(getVerifiedSessionTokenMetadata("not-a-jwt"), null);
});

test("logout revokes the current access token and all refresh tokens", () => {
  const logout = read("src/actions/auth/logout.ts");
  const proxy = read("src/proxy.ts");
  const migration = read("supabase/migrations/20260907110000_revoked_auth_sessions.sql");
  assert.match(logout, /revoked_auth_sessions/);
  assert.match(logout, /scope: "global"/);
  assert.match(proxy, /is_auth_session_revoked/);
  assert.match(migration, /force row level security/);
  assert.match(migration, /revoked\.user_id = auth\.uid\(\)/);
  assert.match(migration, /revoke all on table public\.revoked_auth_sessions from anon, authenticated/);
});

test("session revocation migration executes with private RLS defaults", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create schema auth; " +
        "create table auth.users(id uuid primary key); " +
        "create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;",
    );
    await db.exec(read("supabase/migrations/20260907110000_revoked_auth_sessions.sql"));
    const security = await db.query(
      "select relrowsecurity,relforcerowsecurity from pg_class where relname='revoked_auth_sessions'",
    );
    assert.deepEqual(security.rows[0], {
      relrowsecurity: true,
      relforcerowsecurity: true,
    });
  } finally {
    await db.close();
  }
});

test("RBAC edits validate both the requested and existing role boundaries", () => {
  const admin = read("src/lib/rbac/admin.ts");
  assert.match(admin, /canAssignRole\(parsed\.data\.role_id\)/);
  assert.match(admin, /canAssignRole\(existingProfile\.data\.role_id\)/);
  assert.match(admin, /canAssignRole\(parsedId\.data\)/);
  assert.match(admin, /Invalid user identifier/);
  assert.match(admin, /actor\.role\.slug !== "super_admin"/);
  assert.match(admin, /Only a Super Admin can create or redefine permission keys/);
});

test("expensive authenticated features use an atomic private rate limiter", () => {
  const migration = read("supabase/migrations/20260907120000_feature_abuse_rate_limits.sql");
  const upload = read("src/app/api/media/upload/route.ts");
  const avatar = read("src/app/api/profile/avatar/route.ts");
  const pdf = read("src/app/api/custom-itineraries/[id]/pdf/route.ts");
  assert.match(migration, /for update/);
  assert.match(migration, /force row level security/);
  assert.match(migration, /revoke all on function public\.consume_feature_rate_limit[\s\S]*from public, anon, authenticated/);
  assert.match(upload, /scope: "media-upload"/);
  assert.match(avatar, /scope: "profile-avatar-upload"/);
  assert.match(pdf, /scope: "quotation-pdf-export"/);
});

test("feature limiter migration executes and enforces its exact bucket limit", async () => {
  const db = new PGlite();
  try {
    await db.exec("create role anon; create role authenticated; create role service_role;");
    await db.exec(read("supabase/migrations/20260907120000_feature_abuse_rate_limits.sql"));
    const first = await db.query("select public.consume_feature_rate_limit('media-upload','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',2,3600) as result");
    const second = await db.query("select public.consume_feature_rate_limit('media-upload','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',2,3600) as result");
    const third = await db.query("select public.consume_feature_rate_limit('media-upload','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',2,3600) as result");
    assert.equal(first.rows[0].result.allowed, true);
    assert.equal(second.rows[0].result.allowed, true);
    assert.equal(third.rows[0].result.allowed, false);
    const security = await db.query("select relrowsecurity,relforcerowsecurity from pg_class where relname='feature_rate_limits'");
    assert.deepEqual(security.rows[0], { relrowsecurity: true, relforcerowsecurity: true });
  } finally {
    await db.close();
  }
});

test("existing-record editors require view plus a relevant mutation permission", () => {
  const hotel = read("src/app/home/hotels/[id]/edit/page.tsx");
  const pkg = read("src/app/home/packages/[id]/edit/page.tsx");
  assert.match(hotel, /!canView \|\| \(!canUpdate && !canManagePricing\)/);
  assert.match(pkg, /!canView \|\| \(!canUpdate && !canManagePricing && !canPublish\)/);
});

test("unsafe production requests require the configured same origin", () => {
  const security = read("src/lib/security/request-security.ts");
  assert.match(security, /if \(!origin\) return process\.env\.NODE_ENV !== "production"/);
  assert.match(security, /new URL\(origin\)\.origin === new URL\(configured\)\.origin/);
});

test("region API strictly validates IDs, fields, and Media Library URL binding", () => {
  const route = read("src/app/api/regions/[id]/route.ts");
  assert.match(route, /updateRegionSchema/);
  assert.match(route, /\.strict\(\)/);
  assert.match(route, /z\.uuid\(\)\.safeParse\(id\)/);
  assert.match(route, /imageUrl = mediaAsset\.original_url/);
  assert.match(route, /url\.hostname === "ik\.imagekit\.io"/);
});

test("catalog image fields are bound to public Media Library records", () => {
  const selection = read("src/lib/media/selection.ts");
  assert.match(selection, /\.eq\("is_public", true\)/);
  assert.match(selection, /\.neq\("folder", "\/awesomeroutes\/profiles"\)/);
  assert.match(selection, /imageUrl: data\.original_url/);
  for (const file of [
    "src/lib/countries/mutations.ts",
    "src/lib/regions/mutations.ts",
    "src/lib/destinations/mutations.ts",
    "src/lib/locations/mutations.ts",
  ]) assert.match(read(file), /resolveSelectedImage/);
});

test("uploads reject declarations that disagree with server-detected bytes and re-encode images", () => {
  const upload = read("src/app/api/media/upload/route.ts");
  const avatar = read("src/app/api/profile/avatar/route.ts");
  const sanitizer = read("src/lib/media/sanitize-image.ts");
  for (const route of [upload, avatar]) {
    assert.match(route, /detectedMime !== file\.type/);
    assert.match(route, /MAX_FILE_SIZE/);
    assert.doesNotMatch(route, /image\/svg\+xml/);
  }
  assert.match(sanitizer, /limitInputPixels/);
  assert.match(sanitizer, /\.jpeg\(|\.png\(|\.webp\(/);
});

test("React source has no direct user-controlled HTML execution sink", () => {
  const combined = [...sourceText("src/components"), ...sourceText("src/app")].join("\n");
  assert.doesNotMatch(combined, /dangerouslySetInnerHTML|\.innerHTML\s*=|\beval\s*\(|new Function\s*\(/);
});

test("public health response does not disclose server time or internals", () => {
  const health = read("src/app/api/health/route.ts");
  assert.match(health, /status: "ok"/);
  assert.doesNotMatch(health, /timestamp|process\.env|version|database/i);
});
