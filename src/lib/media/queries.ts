import { createClient } from "@/lib/supabase/server";

export type MediaAssetFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  folder?: string;
  status?: "active" | "archived";
  mediaType?: "image" | "video" | "document";
};

export async function getMediaAssets(
  filters: MediaAssetFilters = {}
) {
  const {
    page = 1,
    pageSize = 24,
    search = "",
    folder,
    status = "active",
    mediaType = "image",
  } = filters;

  const safePage = Math.max(1, page);
  const safePageSize = Math.min(
    Math.max(1, pageSize),
    100
  );

  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  const supabase = await createClient();

  let query = supabase
    .from("media_assets")
    .select(
      `
        id,
        imagekit_file_id,
        original_url,
        file_path,
        file_name,
        original_file_name,
        media_type,
        mime_type,
        size_bytes,
        width,
        height,
        folder,
        alt_text,
        tags,
        status,
        is_public,
        uploaded_by,
        created_at,
        updated_at
      `,
      {
        count: "exact",
      }
    )
    .eq("status", status)
    .eq("media_type", mediaType)
    .order("created_at", {
      ascending: false,
    })
    .range(from, to);

  if (folder) {
    query = query.eq("folder", folder);
  }

  if (search.trim()) {
    query = query.ilike(
      "file_name",
      `%${search.trim()}%`
    );
  }

  const {
    data,
    error,
    count,
  } = await query;

  if (error) {
    console.error(
      "Failed to fetch media assets:",
      error
    );

    throw new Error(
      "Failed to load media library."
    );
  }

  return {
    data: data ?? [],
    count: count ?? 0,
    page: safePage,
    pageSize: safePageSize,
  };
}

export async function getMediaAssetById(
  id: string
) {
  const supabase = await createClient();

  const {
    data,
    error,
  } = await supabase
    .from("media_assets")
    .select(
      `
        id,
        imagekit_file_id,
        original_url,
        file_path,
        file_name,
        original_file_name,
        media_type,
        mime_type,
        size_bytes,
        width,
        height,
        folder,
        alt_text,
        tags,
        status,
        is_public,
        uploaded_by,
        created_at,
        updated_at
      `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(
      "Failed to fetch media asset:",
      error
    );

    throw new Error(
      "Failed to load media asset."
    );
  }

  return data;
}

export async function getMediaFolders() {
  const supabase = await createClient();

  const {
    data,
    error,
  } = await supabase
    .from("media_assets")
    .select("folder")
    .eq("status", "active")
    .order("folder", {
      ascending: true,
    });

  if (error) {
    console.error(
      "Failed to fetch media folders:",
      error
    );

    throw new Error(
      "Failed to load media folders."
    );
  }

  return [
    ...new Set(
      (data ?? []).map(
        (item) => item.folder
      )
    ),
  ];
}