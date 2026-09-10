import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const textExtensions = new Set([
  ".css", ".html", ".js", ".json", ".jsx", ".md", ".mjs", ".sql",
  ".toml", ".ts", ".tsx", ".txt", ".yaml", ".yml",
]);

function trackedFiles() {
  return execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    {
      cwd: root,
      encoding: "utf8",
    },
  )
    .split("\0")
    .filter((file) => file && existsSync(path.join(root, file)));
}

function textFiles() {
  return trackedFiles().filter((file) => {
    const base = path.basename(file);
    return base === ".env.example" || textExtensions.has(path.extname(file));
  });
}

function read(file) {
  return readFileSync(path.join(root, file), "utf8");
}

test("tracked source contains no credential-shaped literal", () => {
  const providerPrefixes = [
    "sk_" + "live_",
    "rk_" + "live_",
    "gh" + "p_",
    "github_" + "pat_",
    "sb_" + "secret_",
    "AK" + "IA",
  ];
  const patterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
    /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
    /(?:postgres(?:ql)?|mongodb(?:\+srv)?|mysql|redis):\/\/[^\s:@/]+:[^\s@/]+@/i,
    /(?:api[_-]?key|secret|token|password|passwd|private[_-]?key|client[_-]?secret|database[_-]?url|connection[_-]?string)\s*[:=]\s*["'][^"'\r\n]{8,}["']/i,
    new RegExp(providerPrefixes.map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")),
  ];
  const findings = [];
  for (const file of textFiles()) {
    if (file === ".env.example" || file === "tests/secret-safety.test.mjs") continue;
    const lines = read(file).split(/\r?\n/);
    lines.forEach((line, index) => {
      if (patterns.some((pattern) => pattern.test(line))) findings.push(`${file}:${index + 1}`);
    });
  }
  assert.deepEqual(findings, []);
});

test("only approved public environment variables can enter browser bundles", () => {
  const approved = new Set([
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ]);
  const discovered = new Set();
  for (const file of textFiles()) {
    if (file === "tests/secret-safety.test.mjs") continue;
    for (const match of read(file).matchAll(/\b(?:NEXT_PUBLIC_|REACT_APP_)[A-Z0-9_]+\b/g)) {
      discovered.add(match[0]);
    }
  }
  assert.deepEqual([...discovered].sort(), [...approved].sort());
});

test("every application environment variable is documented without a real value", () => {
  const example = read(".env.example");
  const documented = new Set(
    [...example.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]),
  );
  const referenced = new Set();
  for (const file of textFiles()) {
    if (file === ".env.example" || file === "tests/secret-safety.test.mjs") continue;
    for (const match of read(file).matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) {
      if (!["NODE_ENV", "NEXT_RUNTIME"].includes(match[1])) referenced.add(match[1]);
    }
  }
  assert.deepEqual([...documented].sort(), [...referenced].sort());
  assert.match(example, /replace-with-/);
  assert.doesNotMatch(example, /-----BEGIN|eyJ[A-Za-z0-9_-]{10,}\.|(?:postgres|mongodb):\/\//i);
});

test("local environment files are ignored and only the example is tracked", () => {
  const ignore = read(".gitignore");
  assert.match(ignore, /^\.env\*$/m);
  assert.match(ignore, /^!\.env\.example$/m);
  assert.deepEqual(trackedFiles().filter((file) => file.startsWith(".env")), [".env.example"]);
});

test("privileged Supabase client has a server-only boundary", () => {
  const admin = read("src/lib/supabase/admin.ts");
  assert.match(admin, /^import ["']server-only["'];/);
  assert.match(admin, /process\.env\.SUPABASE_SECRET_KEY/);
  assert.doesNotMatch(admin, /NEXT_PUBLIC_(?:SECRET|SERVICE|PRIVATE)/);

  for (const file of textFiles().filter((name) => name.startsWith("src/"))) {
    const source = read(file);
    if (!/^\s*["']use client["']/m.test(source)) continue;
    assert.doesNotMatch(source, /SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|IMAGEKIT_PRIVATE_KEY|lib\/supabase\/admin/);
  }
});

test("all public tables created by migrations enable RLS", () => {
  const migrationDir = path.join(root, "supabase", "migrations");
  const migrations = readdirSync(migrationDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(path.join(migrationDir, file), "utf8"))
    .join("\n");
  const created = new Set(
    [...migrations.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z_][a-z0-9_]*)/gi)]
      .map((match) => match[1]),
  );
  const enabled = new Set(
    [...migrations.matchAll(/alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?public\.([a-z_][a-z0-9_]*)\s+enable\s+row\s+level\s+security/gi)]
      .map((match) => match[1]),
  );
  for (const loop of migrations.matchAll(/foreach\s+\w+\s+in\s+array\s+array\[([\s\S]*?)\]\s+loop([\s\S]*?)end\s+loop/gi)) {
    if (!/enable row level security/i.test(loop[2])) continue;
    for (const table of loop[1].matchAll(/'([a-z_][a-z0-9_]*)'/gi)) enabled.add(table[1]);
  }
  // The final guard dynamically enables RLS for every current public table.
  assert.match(migrations, /from\s+pg_tables[\s\S]*schemaname\s*=\s*'public'[\s\S]*enable row level security/i);
  assert.deepEqual([...created].filter((table) => !enabled.has(table)), []);
});

test("API routes do not return provider or database error messages", () => {
  const apiFiles = textFiles().filter(
    (file) => file.startsWith("src/app/api/") && path.basename(file) === "route.ts",
  );
  for (const file of apiFiles) {
    const source = read(file);
    assert.doesNotMatch(source, /error\s*:\s*(?:uploaded|assetError|updateError|mediaAssetError)\??\.message/);
    assert.doesNotMatch(source, /error\s*:\s*error\.message/);
  }
});
