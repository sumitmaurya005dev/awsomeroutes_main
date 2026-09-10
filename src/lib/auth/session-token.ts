type SessionTokenClaims = {
  exp?: unknown;
  session_id?: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function decodeBase64Url(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return new TextDecoder().decode(
    Uint8Array.from(binary, (character) => character.charCodeAt(0)),
  );
}

/**
 * Reads identifiers only from a token that Supabase has already verified with
 * auth.getUser(). It must never be used as authentication on its own.
 */
export function getVerifiedSessionTokenMetadata(accessToken: string) {
  try {
    const segments = accessToken.split(".");
    if (segments.length !== 3) return null;
    const claims = JSON.parse(decodeBase64Url(segments[1])) as SessionTokenClaims;
    if (
      typeof claims.session_id !== "string" ||
      !UUID_PATTERN.test(claims.session_id) ||
      typeof claims.exp !== "number" ||
      !Number.isSafeInteger(claims.exp)
    ) {
      return null;
    }
    const expiresAt = new Date(claims.exp * 1000);
    if (!Number.isFinite(expiresAt.getTime())) return null;
    return { sessionId: claims.session_id, expiresAt };
  } catch {
    return null;
  }
}
