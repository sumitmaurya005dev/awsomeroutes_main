import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("only the redacting server logger writes to the console", () => {
  let output = "";
  try {
    output = execFileSync(
      "git",
      ["grep", "--no-index", "-nE", "console\\.(log|info|warn|error|debug)", "--", "src"],
      { encoding: "utf8" },
    );
  } catch (error) {
    if (error.status !== 1) throw error;
  }
  const unexpected = output
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((line) => !line.startsWith("src/lib/security/log-server-error.ts:"))
  assert.deepEqual(unexpected, []);
  assert.doesNotMatch(read("src/lib/security/log-server-error.ts"), /message\s*:/);
});

test("PII is not persisted in browser storage", () => {
  assert.throws(
    () => execFileSync("git", ["grep", "-nE", "localStorage|sessionStorage", "--", "src"], { encoding: "utf8" }),
    (error) => error.status === 1,
  );
});

test("Supabase sessions are server-only and use hardened cookie options", () => {
  assert.equal(existsSync(new URL("../src/lib/supabase/client.ts", import.meta.url)), false);
  for (const path of ["src/lib/supabase/server.ts", "src/lib/supabase/middleware.ts"]) {
    const source = read(path);
    assert.match(source, /httpOnly:\s*true/);
    assert.match(source, /sameSite:\s*"lax"/);
    assert.match(source, /secure:\s*process\.env\.NODE_ENV\s*===\s*"production"/);
  }
});

test("passwords are sent only to Supabase Auth and never written to application tables", () => {
  const source = [
    read("src/actions/auth/login.ts"),
    read("src/lib/profile/actions.ts"),
    read("src/lib/rbac/admin.ts"),
  ].join("\n");
  assert.match(source, /signInWithPassword/);
  assert.match(source, /auth\.admin\.createUser/);
  assert.match(source, /auth\.updateUser/);
  assert.doesNotMatch(source, /\.from\("profiles"\)\s*\.(?:insert|upsert|update)\(\{\s*password/);
  assert.doesNotMatch(read("supabase/migrations/20260811100602_remote_schema.sql"), /password_hash|password_digest/);
});

test("media endpoints expose only fields required by the picker", () => {
  const list = read("src/app/api/media/route.ts");
  const upload = read("src/app/api/media/upload/route.ts");
  assert.doesNotMatch(list, /\.select\([^\n]*original_file_name/);
  assert.match(upload, /original_file_name:\s*null/);
  assert.doesNotMatch(upload, /\.select\("[^"]*(?:imagekit_file_id|file_path|mime_type|size_bytes)/);
  assert.doesNotMatch(upload, /prefix\s*:\s*file\.name|\?\s*prefix\s*:\s*file\.name/);
});

test("profile uploads do not disclose user IDs or browser filenames to ImageKit", () => {
  const source = read("src/app/api/profile/avatar/route.ts");
  assert.match(source, /avatar-\$\{crypto\.randomUUID\(\)\}/);
  assert.doesNotMatch(source, /fileName`,\s*`avatar-\$\{targetUserId\}/);
  assert.match(source, /original_file_name:\s*`avatar\./);
  assert.match(source, /alt_text:\s*"Profile photo"/);
});

test("images are re-encoded before third-party upload to remove EXIF metadata", () => {
  const sanitizer = read("src/lib/media/sanitize-image.ts");
  assert.match(sanitizer, /sharp\(/);
  assert.match(sanitizer, /\.rotate\(\)/);
  assert.doesNotMatch(sanitizer, /withMetadata/);
  for (const path of ["src/app/api/media/upload/route.ts", "src/app/api/profile/avatar/route.ts"]) {
    const route = read(path);
    assert.match(route, /sanitizeImageForUpload/);
    assert.match(route, /new Blob\(\[sanitizedImage\]/);
  }
});

test("employee deletion reauthenticates and customer erasure removes snapshots", () => {
  const action = read("src/lib/profile/actions.ts");
  assert.match(action, /signInWithPassword/);
  assert.match(action, /Create another active Super Admin/);
  assert.match(action, /deleteImageKitFile/);
  assert.match(action, /auth\.admin\.deleteUser/);

  const migration = read("supabase/migrations/20260906100000_account_deletion_privacy.sql");
  assert.match(migration, /on delete set null/);
  assert.match(migration, /anonymize_custom_itinerary_customer/);
  assert.match(migration, /source_snapshot\s*=\s*jsonb_build_object\('anonymized', true\)/);
  assert.match(migration, /delete from public\.custom_itinerary_days/);

  const retention = read("supabase/migrations/20260906101000_login_fingerprint_retention.sql");
  assert.match(retention, /updated_at < now\(\) - interval '30 days'/);
});

test("API routes do not return raw exception messages or wildcard rows", () => {
  assert.throws(
    () => execFileSync("git", ["grep", "-nE", "error\\.message|select\\(\\\"\\*\\\"\\)", "--", "src/app/api"], { encoding: "utf8" }),
    (error) => error.status === 1,
  );
});

test("public hotel reads do not expose supplier contact details", () => {
  const migration = read("supabase/migrations/20260906102000_public_hotel_contact_minimization.sql");
  assert.match(migration, /revoke select \(phone, email\) on public\.hotels from anon/);
});

test("privacy retention and public-contact migrations execute in PostgreSQL", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "create role anon; create role authenticated; create role service_role; " +
        "create table public.login_rate_limits(fingerprint text primary key,failure_count integer not null default 0,window_started_at timestamptz not null default now(),blocked_until timestamptz,updated_at timestamptz not null default now()); " +
        "create table public.hotels(id uuid primary key default gen_random_uuid(),phone text,email text); " +
        "grant select(phone,email) on public.hotels to anon;",
    );
    await db.exec(read("supabase/migrations/20260906101000_login_fingerprint_retention.sql"));
    await db.exec(read("supabase/migrations/20260907100000_login_ip_rate_limit.sql"));
    await db.exec(read("supabase/migrations/20260906102000_public_hotel_contact_minimization.sql"));
    await db.exec(
      "insert into login_rate_limits(fingerprint,updated_at) values ('expired',now()-interval '31 days'),('current',now());",
    );
    await db.query("select record_login_attempt('new-failure',false)");
    assert.equal(
      (await db.query("select count(*)::int as n from login_rate_limits where fingerprint='expired'")).rows[0].n,
      0,
    );
    assert.equal(
      (await db.query("select failure_count from login_rate_limits where fingerprint='new-failure'")).rows[0].failure_count,
      1,
    );
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await db.query("select record_login_attempt('limited-ip',false)");
    }
    assert.ok(
      (await db.query("select blocked_until > now() as blocked from login_rate_limits where fingerprint='limited-ip'"))
        .rows[0].blocked,
    );
    const grants = await db.query(
      "select privilege_type from information_schema.column_privileges where grantee='anon' and table_name='hotels' and column_name in ('phone','email')",
    );
    assert.equal(grants.rows.length, 0);
  } finally {
    await db.close();
  }
});
