import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createClient } from "@/lib/supabase/server";

type CreateMediaBody = {
  imagekit_file_id?: unknown;
  original_url?: unknown;
  file_path?: unknown;
  file_name?: unknown;
  original_file_name?: unknown;
  media_type?: unknown;
  mime_type?: unknown;
  size_bytes?: unknown;
  width?: unknown;
  height?: unknown;
  folder?: unknown;
  alt_text?: unknown;
  tags?: unknown;
};

function getPositiveIntegerParam(
  value: string | null,
  fallback: number,
  maximum: number
) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, maximum);
}

const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function isString(
  value: unknown
): value is string {
  return typeof value === "string";
}

function isPositiveInteger(
  value: unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0
  );
}

function isStringArray(
  value: unknown
): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) => typeof item === "string"
    )
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = getPositiveIntegerParam(searchParams.get("page"), 1, 10_000);
    const pageSize = getPositiveIntegerParam(searchParams.get("pageSize"), 24, 100);
    const search = searchParams.get("search")?.trim() ?? "";
    const folder = searchParams.get("folder")?.trim() ?? "";
    const from = (page - 1) * pageSize;

    let query = supabase
      .from("media_assets")
      .select(
        "id, original_url, file_name, original_file_name, folder, alt_text, width, height, created_at",
        { count: "exact" }
      )
      .eq("status", "active")
      .eq("media_type", "image")
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (folder) {
      query = query.eq("folder", folder);
    }

    if (search) {
      query = query.ilike("file_name", `%${search.replace(/[%_]/g, "\\$&")}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Fetch media assets error:", error);
      return NextResponse.json({ error: "Failed to load Media Library." }, { status: 500 });
    }

    return NextResponse.json({
      data: data ?? [],
      count: count ?? 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Fetch media assets API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      (await request.json()) as CreateMediaBody;

    if (
      !isString(body.imagekit_file_id) ||
      !isString(body.original_url) ||
      !isString(body.file_path) ||
      !isString(body.file_name) ||
      !isString(body.mime_type) ||
      !isPositiveInteger(body.size_bytes) ||
      !isString(body.folder)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid media upload data.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !ALLOWED_IMAGE_MIME_TYPES.includes(
        body.mime_type
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Only JPG, PNG, and WEBP images are allowed.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      body.size_bytes >
      5 * 1024 * 1024
    ) {
      return NextResponse.json(
        {
          error:
            "Image size must be less than 5 MB.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      body.media_type !== undefined &&
      body.media_type !== "image"
    ) {
      return NextResponse.json(
        {
          error:
            "Only image media is supported currently.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !body.folder.startsWith(
        "/awesomeroutes"
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid media folder.",
        },
        {
          status: 400,
        }
      );
    }

    let imageUrl: URL;

    try {
      imageUrl = new URL(body.original_url);
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid ImageKit URL.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      imageUrl.protocol !== "https:" ||
      imageUrl.hostname !== "ik.imagekit.io"
    ) {
      return NextResponse.json(
        {
          error:
            "Only ImageKit-hosted files are allowed.",
        },
        {
          status: 400,
        }
      );
    }

    const width = isPositiveInteger(body.width)
      ? body.width
      : null;

    const height = isPositiveInteger(body.height)
      ? body.height
      : null;

    const tags = isStringArray(body.tags)
      ? body.tags
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 20)
      : [];

    const altText = isString(body.alt_text)
      ? body.alt_text.trim() || null
      : null;

    const originalFileName = isString(
      body.original_file_name
    )
      ? body.original_file_name.trim() || null
      : null;

    const { data, error } = await supabase
      .from("media_assets")
      .insert({
        imagekit_file_id:
          body.imagekit_file_id,
        original_url: body.original_url,
        file_path: body.file_path,
        file_name: body.file_name,
        original_file_name: originalFileName,
        media_type: "image",
        mime_type: body.mime_type,
        size_bytes: body.size_bytes,
        width,
        height,
        folder: body.folder,
        alt_text: altText,
        tags,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error(
        "Create media asset error:",
        error
      );

      if (error.code === "23505") {
        return NextResponse.json(
          {
            error:
              "This image already exists in the Media Library.",
          },
          {
            status: 409,
          }
        );
      }

      return NextResponse.json(
        {
          error:
            error.message ||
            "Failed to save image in Media Library.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        data,
        message:
          "Image saved in Media Library.",
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Create media asset API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error.",
      },
      {
        status: 500,
      }
    );
  }
}
