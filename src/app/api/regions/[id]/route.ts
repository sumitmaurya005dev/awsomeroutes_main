import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/auth";

type UpdateRegionBody = {
  name?: unknown;
  slug?: unknown;
  description?: unknown;
  status?: unknown;
  image_url?: unknown;
  image_asset_id?: unknown;
};

function isOptionalString(
  value: unknown
): value is string | null {
  return (
    typeof value === "string" ||
    value === null
  );
}

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    if (!(await hasPermission("regions.update"))) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Region ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const body =
      (await request.json()) as UpdateRegionBody;

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const slug =
      typeof body.slug === "string"
        ? body.slug.trim()
        : "";

    const status =
      body.status === "active" ||
      body.status === "inactive"
        ? body.status
        : null;

    const description = isOptionalString(
      body.description
    )
      ? body.description?.trim() || null
      : null;

  const imageUrl = isOptionalString(
    body.image_url
  )
      ? body.image_url?.trim() || null
      : null;

  const imageAssetId = isOptionalString(
    body.image_asset_id
  )
    ? body.image_asset_id?.trim() || null
    : null;

    if (!name) {
      return NextResponse.json(
        {
          error: "Region name is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!slug) {
      return NextResponse.json(
        {
          error: "Region slug is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!status) {
      return NextResponse.json(
        {
          error:
            "Status must be active or inactive.",
        },
        {
          status: 400,
        }
      );
    }

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

    if (imageAssetId) {
      const {
        data: mediaAsset,
        error: mediaAssetError,
      } = await supabase
        .from("media_assets")
        .select("id")
        .eq("id", imageAssetId)
        .eq("status", "active")
        .maybeSingle();

      if (mediaAssetError) {
        console.error(
          "Media asset validation error:",
          mediaAssetError
        );

        return NextResponse.json(
          {
            error:
              "Failed to validate selected image.",
          },
          {
            status: 500,
          }
        );
      }

      if (!mediaAsset) {
        return NextResponse.json(
          {
            error:
              "Selected image does not exist or is archived.",
          },
          {
            status: 400,
          }
        );
      }
    }

    const { data, error } = await supabase
      .from("regions")
      .update({
        name,
        slug,
        description,
        status,
        image_url: imageUrl,
        image_asset_id: imageAssetId,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error(
        "Supabase region update error:",
        error
      );

      return NextResponse.json(
        {
          error:
            error.message ||
            "Failed to update region.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        data,
        message: "Region updated successfully.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Region PATCH route error:",
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
