type RequiredEnvironmentVariable =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  | "SUPABASE_SECRET_KEY"
  | "IMAGEKIT_PRIVATE_KEY"
  | "APP_ORIGIN";

function looksLikePlaceholder(value: string) {
  return /(?:replace[-_ ]with|your[-_ ]project|example|changeme|placeholder)/i.test(
    value,
  );
}

function requiredValue(name: RequiredEnvironmentVariable) {
  const value = process.env[name]?.trim();
  if (!value || looksLikePlaceholder(value)) {
    throw new Error(`Required environment variable ${name} is not configured.`);
  }
  return value;
}

function validatedUrl(name: "NEXT_PUBLIC_SUPABASE_URL" | "APP_ORIGIN") {
  const raw = requiredValue(name);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Required environment variable ${name} must be a valid URL.`);
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error(`${name} must not contain credentials, query parameters, or fragments.`);
  }
  if (name === "APP_ORIGIN" && url.pathname !== "/") {
    throw new Error("APP_ORIGIN must contain only the trusted application origin.");
  }
  if (
    process.env.NODE_ENV === "production" &&
    (url.protocol !== "https:" || ["localhost", "127.0.0.1", "::1"].includes(url.hostname))
  ) {
    throw new Error(`${name} must use a non-local HTTPS URL in production.`);
  }
  return url.origin;
}

export type ServerEnvironment = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  supabaseSecretKey: string;
  imageKitPrivateKey: string;
  appOrigin: string;
};

/** Fails closed before the application accepts traffic. */
export function validateServerEnvironment(): ServerEnvironment {
  const supabaseUrl = validatedUrl("NEXT_PUBLIC_SUPABASE_URL");
  const appOrigin = validatedUrl("APP_ORIGIN");
  const supabasePublishableKey = requiredValue(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  );
  const supabaseSecretKey = requiredValue("SUPABASE_SECRET_KEY");
  const imageKitPrivateKey = requiredValue("IMAGEKIT_PRIVATE_KEY");

  for (const [name, value] of [
    ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", supabasePublishableKey],
    ["SUPABASE_SECRET_KEY", supabaseSecretKey],
    ["IMAGEKIT_PRIVATE_KEY", imageKitPrivateKey],
  ] as const) {
    if (value.length < 20) {
      throw new Error(`${name} is too short to be a valid credential.`);
    }
  }
  if (supabasePublishableKey === supabaseSecretKey) {
    throw new Error("Supabase publishable and secret keys must be different.");
  }

  return {
    supabaseUrl,
    supabasePublishableKey,
    supabaseSecretKey,
    imageKitPrivateKey,
    appOrigin,
  };
}
