export type ImageKitUploadOptions = {
  file: File;
  folder: string;
  fileNamePrefix: string;
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
  url?: string;
  error?: string;
  message?: string;
};

function getFileExtension(file: File): string {
  const extension = file.name.split(".").pop()?.toLowerCase();

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

export async function uploadImageToImageKit({
  file,
  folder,
  fileNamePrefix,
  onProgress,
}: ImageKitUploadOptions): Promise<string> {
  const authResponse = await fetch("/api/imagekit/auth", {
    method: "GET",
    cache: "no-store",
  });

  const authData =
    (await authResponse.json()) as ImageKitAuthResponse;

  if (!authResponse.ok) {
    throw new Error(
      authData.error ??
        "Failed to authenticate with ImageKit."
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

  // Never overwrite an old image.
  formData.append("useUniqueFileName", "true");

  formData.append("publicKey", authData.publicKey);
  formData.append("signature", authData.signature);
  formData.append("expire", String(authData.expire));
  formData.append("token", authData.token);

  return new Promise<string>((resolve, reject) => {
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
        Math.round((event.loaded / event.total) * 100)
      );
    };

    xhr.onload = () => {
      let result: ImageKitUploadResponse;

      try {
        result = JSON.parse(xhr.responseText);
      } catch {
        reject(
          new Error(
            "Invalid response received from ImageKit."
          )
        );
        return;
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        reject(
          new Error(
            result.error ??
              result.message ??
              "Image upload failed."
          )
        );
        return;
      }

      if (!result.url) {
        reject(
          new Error(
            "Image uploaded, but ImageKit did not return a URL."
          )
        );
        return;
      }

      onProgress?.(100);
      resolve(result.url);
    };

    xhr.onerror = () => {
      reject(
        new Error(
          "Network error while uploading to ImageKit."
        )
      );
    };

    xhr.onabort = () => {
      reject(new Error("Image upload was cancelled."));
    };

    xhr.send(formData);
  });
}