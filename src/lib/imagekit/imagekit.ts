import { getUploadAuthParams } from "@imagekit/next/server";

function getRequiredEnv(
  name: string
): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `${name} is not configured in .env.local`
    );
  }

  return value;
}

export function getImageKitUploadAuth() {
  const publicKey =
    getRequiredEnv(
      "IMAGEKIT_PUBLIC_KEY"
    );

  const privateKey =
    getRequiredEnv(
      "IMAGEKIT_PRIVATE_KEY"
    );

  const {
    token,
    expire,
    signature,
  } = getUploadAuthParams({
    publicKey,
    privateKey,
  });

  return {
    token,
    expire,
    signature,
    publicKey,
  };
}