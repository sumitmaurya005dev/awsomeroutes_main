import "server-only";

type ErrorLike = {
  name?: unknown;
  code?: unknown;
  status?: unknown;
};

function safeIdentifier(value: unknown) {
  return typeof value === "string" && /^[a-z0-9_-]{1,32}$/i.test(value)
    ? value
    : undefined;
}

/**
 * Logs only non-sensitive diagnostic metadata. Error messages, request objects,
 * headers and provider responses are deliberately excluded because they can
 * contain credentials or customer data.
 */
export function logServerError(
  context: string,
  error: unknown,
  correlationId?: string,
) {
  const candidate =
    error && typeof error === "object" ? (error as ErrorLike) : undefined;
  const status =
    typeof candidate?.status === "number" && Number.isInteger(candidate.status)
      ? candidate.status
      : undefined;

  console.error(context, {
    correlationId:
      typeof correlationId === "string" && /^[0-9a-f]{32}$/.test(correlationId)
        ? correlationId
        : undefined,
    name:
      error instanceof Error
        ? safeIdentifier(error.name)
        : safeIdentifier(candidate?.name),
    code: safeIdentifier(candidate?.code),
    status,
  });
}
