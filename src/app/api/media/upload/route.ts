import { Buffer } from "node:buffer";
import { NextRequest, NextResponse } from "next/server";

import { MEDIA_FOLDERS, isMediaLibraryFolder } from "@/config/media";
import type { PermissionKey } from "@/config/permissions";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { detectImageMime } from "@/lib/media/file-validation";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_REQUEST_SIZE = MAX_FILE_SIZE + 1024 * 1024;
const MAX_UPLOADS_PER_HOUR = 30;
const MAX_IMAGE_PIXELS = 40_000_000;
const IMAGEKIT_TIMEOUT_MS = 30_000;

const FOLDER_PERMISSIONS: Record<string, readonly PermissionKey[]> = {
  [MEDIA_FOLDERS.COUNTRIES]: ["countries.create", "countries.update"],
  [MEDIA_FOLDERS.REGIONS]: ["regions.create", "regions.update"],
  [MEDIA_FOLDERS.DESTINATIONS]: [
    "destinations.create",
    "destinations.update",
  ],
  [MEDIA_FOLDERS.LOCATIONS]: ["locations.create", "locations.update"],
  [MEDIA_FOLDERS.HOTELS]: ["hotels.create", "hotels.update"],
  [MEDIA_FOLDERS.ACTIVITIES]: ["activities.create", "activities.update"],
  [MEDIA_FOLDERS.PACKAGES]: ["packages.create", "packages.update"],
};

type ImageKitUpload = {
  fileId?: string;
  name?: string;
  url?: string;
  filePath?: string;
  width?: number;
  height?: number;
  size?: number;
  message?: string;
};

function extensionFor(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function safePrefix(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "image";
}

async function deleteImageKitFile(fileId: string, privateKey: string) {
  const response = await fetch(`https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: { Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}` },
  });
  if (!response.ok && response.status !== 404) console.error("ImageKit cleanup failed:", response.status);
}

export async function POST(request: NextRequest) {
  try {
    const [user, canUpload] = await Promise.all([getCurrentUser(), hasPermission("media.create")]);
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    if (!canUpload) return NextResponse.json({ error: "You are not allowed to upload media." }, { status: 403 });

    const declaredRequestSize = Number(request.headers.get("content-length"));
    if (
      Number.isFinite(declaredRequestSize) &&
      declaredRequestSize > MAX_REQUEST_SIZE
    ) {
      return NextResponse.json(
        { error: "Upload request is too large." },
        { status: 413 },
      );
    }

    const body = await request.formData();
    const file = body.get("file");
    const folder = body.get("folder");
    const prefix = body.get("fileNamePrefix");
    const altText = body.get("altText");
    if (!(file instanceof File) || !ALLOWED_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Use a JPG, PNG, or WEBP image smaller than 5 MB." }, { status: 400 });
    }
    if (typeof folder !== "string" || !isMediaLibraryFolder(folder)) {
      return NextResponse.json({ error: "Invalid Media Library folder." }, { status: 400 });
    }
    const folderPermissions = FOLDER_PERMISSIONS[folder] ?? [];
    const canUseFolder = (
      await Promise.all(folderPermissions.map((permission) => hasPermission(permission)))
    ).some(Boolean);
    if (!canUseFolder) {
      return NextResponse.json(
        { error: "You are not allowed to upload media for this module." },
        { status: 403 },
      );
    }

    const detectedMime = detectImageMime(
      new Uint8Array(await file.slice(0, 12).arrayBuffer()),
    );
    if (!detectedMime || detectedMime !== file.type) {
      return NextResponse.json(
        { error: "The uploaded file content does not match its image type." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { count, error: quotaError } = await supabase
      .from("media_assets")
      .select("id", { count: "exact", head: true })
      .eq("uploaded_by", user.id)
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
    if (quotaError) return NextResponse.json({ error: "Could not verify upload quota." }, { status: 503 });
    if ((count ?? 0) >= MAX_UPLOADS_PER_HOUR) {
      return NextResponse.json({ error: "Hourly upload limit reached. Please try again later." }, { status: 429 });
    }

    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    if (!privateKey) return NextResponse.json({ error: "Image upload is not configured." }, { status: 500 });

    const imageKitForm = new FormData();
    imageKitForm.append("file", file);
    imageKitForm.append("fileName", `${safePrefix(typeof prefix === "string" ? prefix : file.name)}-${Date.now()}.${extensionFor(file)}`);
    imageKitForm.append("folder", folder);
    imageKitForm.append("useUniqueFileName", "true");

    const uploadResponse = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}` },
      body: imageKitForm,
      signal: AbortSignal.timeout(IMAGEKIT_TIMEOUT_MS),
    });
    const uploadBody = await uploadResponse.text();
    let uploaded: ImageKitUpload = {};
    try {
      uploaded = JSON.parse(uploadBody) as ImageKitUpload;
    } catch {
      // ImageKit can occasionally return an empty/non-JSON gateway response.
    }
    if (!uploadResponse.ok || !uploaded.fileId || !uploaded.url || !uploaded.filePath || !uploaded.name) {
      return NextResponse.json({ error: uploaded.message ?? "ImageKit upload failed." }, { status: 502 });
    }
    if (!uploaded.filePath.startsWith(`${folder}/`)) {
      await deleteImageKitFile(uploaded.fileId, privateKey);
      return NextResponse.json({ error: "ImageKit returned an unexpected file path." }, { status: 502 });
    }
    if (
      uploaded.width &&
      uploaded.height &&
      uploaded.width * uploaded.height > MAX_IMAGE_PIXELS
    ) {
      await deleteImageKitFile(uploaded.fileId, privateKey);
      return NextResponse.json(
        { error: "Image dimensions are too large. Use an image below 40 megapixels." },
        { status: 400 },
      );
    }

    const { data: asset, error: assetError } = await supabase.from("media_assets").insert({
      imagekit_file_id: uploaded.fileId,
      original_url: uploaded.url,
      file_path: uploaded.filePath,
      file_name: uploaded.name,
      original_file_name: file.name.slice(0, 255),
      media_type: "image",
      mime_type: file.type,
      size_bytes: uploaded.size ?? file.size,
      width: uploaded.width ?? null,
      height: uploaded.height ?? null,
      folder,
      alt_text: typeof altText === "string" ? altText.trim().slice(0, 300) || null : null,
      tags: [],
      is_public: true,
      uploaded_by: user.id,
    }).select("id,imagekit_file_id,original_url,file_path,file_name,mime_type,size_bytes,width,height,folder,alt_text").single();

    if (assetError || !asset) {
      await deleteImageKitFile(uploaded.fileId, privateKey);
      return NextResponse.json({ error: "Image was uploaded but could not be saved. The upload was rolled back." }, { status: 500 });
    }

    return NextResponse.json({ data: asset }, { status: 201 });
  } catch (error) {
    console.error("Secure media upload error:", error);
    return NextResponse.json({ error: "Image upload failed. Please try again." }, { status: 500 });
  }
}
