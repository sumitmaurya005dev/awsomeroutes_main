export function getNetworkErrorMessage(
  error: unknown,
  fallback = "The request could not be completed. Please try again. If it continues, refresh the page.",
) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "You appear to be offline. Check your internet connection and try again.";
  }

  if (error instanceof Error && error.message) {
    const message = error.message.toLowerCase();
    if (message.includes("failed to fetch") || message.includes("network") || message.includes("server action")) {
      return "The server connection was interrupted. Your changes may not have been saved. Refresh the page and try again.";
    }
  }

  return fallback;
}
