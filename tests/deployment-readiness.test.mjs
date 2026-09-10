import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { validateServerEnvironment } from "../src/config/environment.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");

function sourceFiles() {
  return execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "src", "next.config.ts"],
    { cwd: root, encoding: "utf8" },
  )
    .split(/\r?\n/)
    .filter((file) => file && existsSync(path.join(root, file)));
}

function withEnvironment(values, callback) {
  const names = [
    "NODE_ENV",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
    "IMAGEKIT_PRIVATE_KEY",
    "APP_ORIGIN",
  ];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  try {
    for (const name of names) delete process.env[name];
    Object.assign(process.env, values);
    return callback();
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
}

test("critical deployment environment fails closed and rejects insecure production URLs", () => {
  withEnvironment({ NODE_ENV: "production" }, () => {
    assert.throws(validateServerEnvironment, /NEXT_PUBLIC_SUPABASE_URL/);
  });
  withEnvironment(
    {
      NODE_ENV: "production",
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key-at-least-twenty",
      SUPABASE_SECRET_KEY: "server-" + "x".repeat(32),
      IMAGEKIT_PRIVATE_KEY: ["provider", "x".repeat(32)].join("-"),
      APP_ORIGIN: "http://localhost:3000",
    },
    () => assert.throws(validateServerEnvironment, /HTTPS URL/),
  );
  withEnvironment(
    {
      NODE_ENV: "production",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key-at-least-twenty",
      SUPABASE_SECRET_KEY: "server-" + "x".repeat(32),
      IMAGEKIT_PRIVATE_KEY: ["provider", "x".repeat(32)].join("-"),
      APP_ORIGIN: "https://portal.awesomeroutes.com",
    },
    () => assert.equal(validateServerEnvironment().appOrigin, "https://portal.awesomeroutes.com"),
  );
  assert.match(read("next.config.ts"), /validateServerEnvironment\(\)/);
  assert.match(read("src/instrumentation.ts"), /validateServerEnvironment\(\)/);
});

test("debug artifacts, incomplete security markers, and test-only routes are absent", () => {
  const code = sourceFiles().map((file) => `${file}\n${read(file)}`).join("\n");
  assert.doesNotMatch(code, /\b(?:TODO|FIXME|HACK|XXX)\b/i);
  assert.doesNotMatch(code, /^\s*\/\/\s*(?:import|export|const|let|var|function|return|await|if|for|while|type|interface|class|<|\{|\})/m);
  assert.doesNotMatch(code, /\bdebugger\s*;/);
  assert.equal(existsSync(path.join(root, "src/app/api/imagekit/auth/route.ts")), false);
  const routes = sourceFiles().filter((file) => /src[\\/]app[\\/]api[\\/].*route\.ts$/.test(file));
  assert.equal(routes.some((file) => /(?:test|debug|admin-backdoor|seed-data)/i.test(file)), false);
});

test("responses have strict production headers, nonce CSP, and correlation IDs", () => {
  const config = read("next.config.ts");
  const proxy = read("src/proxy.ts");
  const security = read("src/lib/security/request-security.ts");
  assert.match(config, /X-Content-Type-Options/);
  assert.match(config, /X-Frame-Options/);
  assert.match(config, /max-age=31536000/);
  assert.match(security, /script-src 'self' 'nonce-\$\{nonce\}'/);
  assert.doesNotMatch(security, /script-src[^\n]*unsafe-inline/);
  assert.match(proxy, /x-correlation-id/);
  assert.match(security, /X-Correlation-ID/);
  assert.doesNotMatch(`${config}\n${security}\n${proxy}`, /Access-Control-Allow-Origin[^\n]*\*/i);
  assert.match(proxy, /originIsAllowed/);
});

test("login is limited by an IP-only HMAC bucket and no other public auth endpoints exist", () => {
  const login = read("src/actions/auth/login.ts");
  const migration = read("supabase/migrations/20260907100000_login_ip_rate_limit.sql");
  assert.match(login, /update\(`login:\$\{ipAddress\}`\)/);
  assert.doesNotMatch(login, /ipAddress\}\|\$\{email/);
  assert.match(migration, /interval '1 minute'/);
  assert.match(migration, /next_count >= 5/);
  assert.doesNotMatch(read("src/app/page.tsx"), /Forgot Password|Remember me/);
  const routes = sourceFiles().filter((file) => /src[\\/]app[\\/]api[\\/].*route\.ts$/.test(file));
  assert.equal(routes.some((file) => /(?:signup|register|password-reset|forgot-password|otp)/i.test(file)), false);
});

test("database access uses authenticated HTTPS Supabase APIs and no direct database port", () => {
  const source = sourceFiles().map(read).join("\n");
  assert.doesNotMatch(source, /(?:postgres(?:ql)?|mongodb(?:\+srv)?|mysql):\/\//i);
  assert.doesNotMatch(source, /(?:5432|27017|3306)/);
  assert.match(read("src/config/environment.ts"), /must use a non-local HTTPS URL in production/);
  assert.match(read("src/lib/supabase/admin.ts"), /SUPABASE_SECRET_KEY/);
});
