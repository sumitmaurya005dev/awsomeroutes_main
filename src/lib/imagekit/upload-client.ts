export const MEDIA_FOLDERS = {
  COUNTRIES: "/awesomeroutes/countries",
  REGIONS: "/awesomeroutes/regions",
  DESTINATIONS: "/awesomeroutes/destinations",
  LOCATIONS: "/awesomeroutes/locations",
  HOTELS: "/awesomeroutes/hotels",
  ACTIVITIES: "/awesomeroutes/activities",
  PACKAGES: "/awesomeroutes/packages",
  PROFILES: "/awesomeroutes/profiles",
} as const;

export type MediaFolder =
  (typeof MEDIA_FOLDERS)[keyof typeof MEDIA_FOLDERS];

export type MediaAsset = {
  id: string;
  imagekit_file_id: string;
  original_url: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  folder: string;
  alt_text: string | null;
};

export type ImageKitUploadOptions = {
  file: File;
  folder: MediaFolder;
  fileNamePrefix: string;
  altText?: string;
  tags?: string[];
  onProgress?: (progress: number) => void;
};

type ImageKitAuthResponse = {
  token?: string;
  expire?: number;
  signature?: string;
  publicKey?: string;
  error?: string;
};

type ImageKitUploadResponse = {
  fileId?: string;
  name?: string;
  url?: string;
  filePath?: string;
  height?: number;
  width?: number;
  size?: number;
  error?: string;
  message?: string;
};

type CreateMediaResponse = {
  data?: MediaAsset;
  error?: string;
};

function getFileExtension(file: File): string {
  const extension = file.name
    .split(".")
    .pop()
    ?.toLowerCase();

  if (
    extension === "png" ||
    extension === "jpg" ||
    extension === "jpeg" ||
    extension === "webp"
  ) {
    return extension;
  }

  return "jpg";
}

async function parseResponseJson<T>(
  response: Response,
  label: string
): Promise<T> {
  const text = await response.text();

  try {
    return JSON.parse(text) as T;
  } catch {
    console.error(`${label} raw response:`, text);

    throw new Error(
      `${label} returned an invalid response (status ${response.status}).`
    );
  }
}

export async function uploadImageToImageKit({
  file,
  folder,
  fileNamePrefix,
  altText,
  tags = [],
  onProgress,
}: ImageKitUploadOptions): Promise<MediaAsset> {
  const authResponse = await fetch(
    "/api/imagekit/auth",
    {
      method: "GET",
      cache: "no-store",
    }
  );

  const authData =
    await parseResponseJson<ImageKitAuthResponse>(
      authResponse,
      "ImageKit auth API"
    );

  if (!authResponse.ok) {
    throw new Error(
      authData.error ??
        `Failed to authenticate with ImageKit (status ${authResponse.status}).`
    );
  }

  if (
    !authData.token ||
    !authData.expire ||
    !authData.signature ||
    !authData.publicKey
  ) {
    throw new Error(
      "Incomplete ImageKit authentication response."
    );
  }

  const extension = getFileExtension(file);

  const formData = new FormData();

  formData.append("file", file);

  formData.append(
    "fileName",
    `${fileNamePrefix}.${extension}`
  );

  formData.append("folder", folder);

  // Never overwrite an existing file.
  formData.append(
    "useUniqueFileName",
    "true"
  );

  formData.append(
    "publicKey",
    authData.publicKey
  );

  formData.append(
    "signature",
    authData.signature
  );

  formData.append(
    "expire",
    String(authData.expire)
  );

  formData.append("token", authData.token);

  const imageKitResult =
    await new Promise<ImageKitUploadResponse>(
      (resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open(
          "POST",
          "https://upload.imagekit.io/api/v1/files/upload"
        );

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) {
            return;
          }

          onProgress?.(
            Math.round(
              (event.loaded / event.total) * 100
            )
          );
        };

        xhr.onload = () => {
          let result: ImageKitUploadResponse;

          try {
            result = JSON.parse(
              xhr.responseText
            ) as ImageKitUploadResponse;
          } catch {
            console.error(
              "ImageKit upload raw response:",
              xhr.responseText
            );

            reject(
              new Error(
                `ImageKit returned an invalid response (status ${xhr.status}).`
              )
            );
            return;
          }

          if (
            xhr.status < 200 ||
            xhr.status >= 300
          ) {
            reject(
              new Error(
                result.error ??
                  result.message ??
                  `Image upload failed (status ${xhr.status}).`
              )
            );
            return;
          }

          resolve(result);
        };

        xhr.onerror = () => {
          reject(
            new Error(
              "Network error while uploading to ImageKit."
            )
          );
        };

        xhr.onabort = () => {
          reject(
            new Error(
              "Image upload was cancelled."
            )
          );
        };

        xhr.send(formData);
      }
    );

  if (
    !imageKitResult.fileId ||
    !imageKitResult.url ||
    !imageKitResult.filePath ||
    !imageKitResult.name
  ) {
    throw new Error(
      "ImageKit upload succeeded but required file details were not returned."
    );
  }

  const mediaResponse = await fetch(
    "/api/media",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imagekit_file_id: imageKitResult.fileId,
        original_url: imageKitResult.url,
        file_path: imageKitResult.filePath,
        file_name: imageKitResult.name,
        original_file_name: file.name,
        media_type: "image",
        mime_type: file.type,
        size_bytes: imageKitResult.size ?? file.size,
        width: imageKitResult.width ?? null,
        height: imageKitResult.height ?? null,
        folder,
        alt_text: altText ?? null,
        tags,
      }),
    }
  );

  const mediaData =
    await parseResponseJson<CreateMediaResponse>(
      mediaResponse,
      "Media Library API"
    );

  if (!mediaResponse.ok || !mediaData.data) {
    throw new Error(
      mediaData.error ??
        `Failed to save image in Media Library (status ${mediaResponse.status}).`
    );
  }

  onProgress?.(100);

  return mediaData.data;
}
