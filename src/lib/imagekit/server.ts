import "server-only";

const IMAGEKIT_TIMEOUT_MS = 30_000;

export async function deleteImageKitFile(fileId: string) {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) return false;

  try {
    const response = await fetch(
      `https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}`,
        },
        signal: AbortSignal.timeout(IMAGEKIT_TIMEOUT_MS),
      },
    );

    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}
