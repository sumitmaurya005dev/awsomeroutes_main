import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

function isTrustedLegacyImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "ik.imagekit.io";
  } catch {
    return false;
  }
}

/** Resolve catalog image URLs from the selected DB row, never from a second
 * client-controlled value. Trusted legacy ImageKit URLs remain editable while
 * old rows are migrated to media_assets IDs. */
export async function resolveSelectedImage(
  assetId: string | null | undefined,
  requestedUrl: string | null | undefined,
) {
  if (assetId) {
    const parsedId = z.string().uuid().safeParse(assetId);
    if (!parsedId.success) throw new Error("Select a valid Media Library image.");
    const db = await createClient();
    const { data, error } = await db
      .from("media_assets")
      .select("id,original_url")
      .eq("id", parsedId.data)
      .eq("status", "active")
      .eq("media_type", "image")
      .eq("is_public", true)
      .neq("folder", "/awesomeroutes/profiles")
      .maybeSingle();
    if (error || !data) throw new Error("Selected Media Library image is unavailable.");
    return { imageAssetId: data.id, imageUrl: data.original_url };
  }

  const imageUrl = requestedUrl?.trim() || null;
  if (imageUrl && !isTrustedLegacyImageUrl(imageUrl)) {
    throw new Error("Select an image from the Media Library.");
  }
  return { imageAssetId: null, imageUrl };
}
