import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const PROFILE_FOLDER = "/awesomeroutes/profiles";
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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

async function deleteImageKitFile(fileId: string) {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) return false;

  const response = await fetch(`https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}`,
    },
  });
  return response.ok || response.status === 404;
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get("file");
    const requestedUserId = formData.get("userId");
    const targetUserId = typeof requestedUserId === "string" && requestedUserId ? requestedUserId : currentUser.id;
    const canManageOthers = await hasPermission("users.update");

    if (targetUserId !== currentUser.id && !canManageOthers) {
      return NextResponse.json({ error: "You can update only your own photo." }, { status: 403 });
    }

    if (!(file instanceof File) || !ALLOWED_TYPES.has(file.type) || file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Use a JPG, PNG, or WEBP image smaller than 2 MB." }, { status: 400 });
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

    const imageKitForm = new FormData();
    imageKitForm.append("file", file);
    imageKitForm.append("fileName", `avatar-${targetUserId}-${Date.now()}.${extensionFor(file)}`);
    imageKitForm.append("folder", PROFILE_FOLDER);
    imageKitForm.append("useUniqueFileName", "true");
    imageKitForm.append("tags", "profile-avatar");

    const uploadResponse = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}` },
      body: imageKitForm,
    });
    const uploaded = (await uploadResponse.json()) as ImageKitUpload;
    if (!uploadResponse.ok || !uploaded.fileId || !uploaded.url || !uploaded.filePath || !uploaded.name) {
      return NextResponse.json({ error: uploaded.message ?? "Avatar upload failed." }, { status: 502 });
    }

    const { data: asset, error: assetError } = await admin.from("media_assets").insert({
      imagekit_file_id: uploaded.fileId,
      original_url: uploaded.url,
      file_path: uploaded.filePath,
      file_name: uploaded.name,
      original_file_name: file.name,
      media_type: "image",
      mime_type: file.type,
      size_bytes: uploaded.size ?? file.size,
      width: uploaded.width ?? null,
      height: uploaded.height ?? null,
      folder: PROFILE_FOLDER,
      alt_text: `${targetUserId} profile photo`,
      tags: ["profile-avatar"],
      is_public: false,
      uploaded_by: targetUserId,
    }).select("id").single();
    if (assetError || !asset) {
      await deleteImageKitFile(uploaded.fileId);
      return NextResponse.json({ error: assetError?.message ?? "Failed to save avatar." }, { status: 500 });
    }

    const { error: updateError } = await admin.from("profiles").update({ avatar_url: uploaded.url, updated_at: new Date().toISOString() }).eq("id", targetUserId);
    if (updateError) {
      await admin.from("media_assets").delete().eq("id", asset.id);
      await deleteImageKitFile(uploaded.fileId);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (targetProfile.avatar_url) {
      const { data: oldAsset } = await admin.from("media_assets").select("id,imagekit_file_id").eq("uploaded_by", targetUserId).eq("folder", PROFILE_FOLDER).eq("original_url", targetProfile.avatar_url).maybeSingle();
      if (oldAsset) {
        const remoteDeleted = await deleteImageKitFile(oldAsset.imagekit_file_id);
        if (remoteDeleted) {
          const { error: oldAssetDeleteError } = await admin.from("media_assets").delete().eq("id", oldAsset.id);
          if (oldAssetDeleteError) console.error("Old avatar database cleanup failed:", oldAssetDeleteError.message);
        } else {
          console.error("Old avatar remains tracked because ImageKit deletion failed.");
        }
      }
    }

    return NextResponse.json({ data: { avatar_url: uploaded.url } });
  } catch (error) {
    console.error("Profile avatar upload error:", error);
    return NextResponse.json({ error: "Failed to upload profile photo." }, { status: 500 });
  }
}
