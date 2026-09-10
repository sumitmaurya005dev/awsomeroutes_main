import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/auth";
import { detectImageMime } from "@/lib/media/file-validation";
import { sanitizeImageForUpload } from "@/lib/media/sanitize-image";
import { deleteImageKitFile } from "@/lib/imagekit/server";
import { logServerError } from "@/lib/security/log-server-error";
import { getCorrelationId } from "@/lib/security/request-security";
import { consumeFeatureRateLimit } from "@/lib/security/feature-rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

const PROFILE_FOLDER = "/awesomeroutes/profiles";
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const MAX_REQUEST_SIZE = MAX_FILE_SIZE + 512 * 1024;
const IMAGEKIT_TIMEOUT_MS = 30_000;

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
  return file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
}

export async function POST(request: NextRequest) {
  const correlationId = getCorrelationId(request);
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const declaredRequestSize = Number(request.headers.get("content-length"));
    if (
      Number.isFinite(declaredRequestSize) &&
      declaredRequestSize > MAX_REQUEST_SIZE
    ) {
      return NextResponse.json({ error: "Upload request is too large." }, { status: 413 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const requestedUserId = formData.get("userId");
    const targetUserId = typeof requestedUserId === "string" && requestedUserId ? requestedUserId : currentUser.id;
    if (!z.string().uuid().safeParse(targetUserId).success) {
      return NextResponse.json({ error: "Invalid user identifier." }, { status: 400 });
    }
    const canManageOthers = await hasPermission("users.update");

    if (targetUserId !== currentUser.id && !canManageOthers) {
      return NextResponse.json({ error: "You can update only your own photo." }, { status: 403 });
    }

    const quota = await consumeFeatureRateLimit({
      scope: "profile-avatar-upload",
      subject: currentUser.id,
      limit: 10,
      windowSeconds: 60 * 60,
    });
    if (!quota.allowed) {
      return NextResponse.json(
        { error: "Hourly profile-photo upload limit reached." },
        {
          status: 429,
          headers: { "Retry-After": String(quota.retryAfterSeconds) },
        },
      );
    }

    if (
      !(file instanceof File) ||
      !ALLOWED_TYPES.has(file.type) ||
      file.size <= 0 ||
      file.size > MAX_FILE_SIZE
    ) {
      return NextResponse.json({ error: "Use a JPG, PNG, or WEBP image smaller than 2 MB." }, { status: 400 });
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

    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    if (!privateKey) return NextResponse.json({ error: "Image upload is not configured." }, { status: 500 });

    const admin = createAdminClient();
    const { data: targetProfile, error: profileError } = await admin
      .from("profiles")
      .select("id, avatar_url")
      .eq("id", targetUserId)
      .maybeSingle();
    if (profileError || !targetProfile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

    const sanitizedImage = await sanitizeImageForUpload(file, detectedMime);
    if (sanitizedImage.byteLength > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "The sanitized profile photo is too large." },
        { status: 400 },
      );
    }
    const imageKitForm = new FormData();
    imageKitForm.append("file", new Blob([sanitizedImage], { type: detectedMime }));
    imageKitForm.append("fileName", `avatar-${crypto.randomUUID()}.${extensionFor(file)}`);
    imageKitForm.append("folder", PROFILE_FOLDER);
    imageKitForm.append("useUniqueFileName", "true");
    imageKitForm.append("tags", "profile-avatar");

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
      // Provider gateway responses are not guaranteed to be JSON.
    }
    if (!uploadResponse.ok || !uploaded.fileId || !uploaded.url || !uploaded.filePath || !uploaded.name) {
      return NextResponse.json({ error: "Avatar provider upload failed." }, { status: 502 });
    }
    if (!uploaded.filePath.startsWith(`${PROFILE_FOLDER}/`)) {
      await deleteImageKitFile(uploaded.fileId);
      return NextResponse.json({ error: "Image provider returned an unexpected file path." }, { status: 502 });
    }

    const { data: asset, error: assetError } = await admin.from("media_assets").insert({
      imagekit_file_id: uploaded.fileId,
      original_url: uploaded.url,
      file_path: uploaded.filePath,
      file_name: uploaded.name,
      original_file_name: `avatar.${extensionFor(file)}`,
      media_type: "image",
      mime_type: file.type,
      size_bytes: uploaded.size ?? file.size,
      width: uploaded.width ?? null,
      height: uploaded.height ?? null,
      folder: PROFILE_FOLDER,
      alt_text: "Profile photo",
      tags: ["profile-avatar"],
      is_public: false,
      uploaded_by: targetUserId,
    }).select("id").single();
    if (assetError || !asset) {
      await deleteImageKitFile(uploaded.fileId);
      return NextResponse.json({ error: "Failed to save avatar." }, { status: 500 });
    }

    const { error: updateError } = await admin.from("profiles").update({ avatar_url: uploaded.url, updated_at: new Date().toISOString() }).eq("id", targetUserId);
    if (updateError) {
      await admin.from("media_assets").delete().eq("id", asset.id);
      await deleteImageKitFile(uploaded.fileId);
      return NextResponse.json({ error: "Failed to update profile photo." }, { status: 500 });
    }

    if (targetProfile.avatar_url) {
      const { data: oldAsset } = await admin.from("media_assets").select("id,imagekit_file_id").eq("uploaded_by", targetUserId).eq("folder", PROFILE_FOLDER).eq("original_url", targetProfile.avatar_url).maybeSingle();
      if (oldAsset) {
        const remoteDeleted = await deleteImageKitFile(oldAsset.imagekit_file_id);
        if (remoteDeleted) {
          const { error: oldAssetDeleteError } = await admin.from("media_assets").delete().eq("id", oldAsset.id);
          if (oldAssetDeleteError) logServerError("Old avatar database cleanup failed.", oldAssetDeleteError, correlationId);
        } else logServerError("Old avatar provider cleanup failed.", { status: 502 }, correlationId);
      }
    }

    return NextResponse.json({ data: { avatar_url: uploaded.url } });
  } catch (error) {
    logServerError("Profile avatar upload failed.", error, correlationId);
    return NextResponse.json({ error: "Failed to upload profile photo." }, { status: 500 });
  }
}
