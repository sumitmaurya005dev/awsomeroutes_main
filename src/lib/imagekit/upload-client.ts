export { MEDIA_FOLDERS } from "@/config/media";
export type { MediaFolder } from "@/config/media";

import type { MediaFolder } from "@/config/media";

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

type UploadResponse = { data?: MediaAsset; error?: string };

export async function uploadImageToImageKit({
  file,
  folder,
  fileNamePrefix,
  altText,
  onProgress,
}: ImageKitUploadOptions): Promise<MediaAsset> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  formData.append("fileNamePrefix", fileNamePrefix);
  if (altText) formData.append("altText", altText);

  onProgress?.(10);
  const response = await fetch("/api/media/upload", { method: "POST", body: formData });
  const text = await response.text();
  let result: UploadResponse;
  try {
    result = text ? JSON.parse(text) as UploadResponse : {};
  } catch {
    throw new Error(`Upload service returned an invalid response (status ${response.status}).`);
  }

  if (!response.ok || !result.data) {
    throw new Error(result.error ?? `Image upload failed (status ${response.status}).`);
  }
  onProgress?.(100);
  return result.data;
}
