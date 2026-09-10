import {
  NextRequest,
  NextResponse,
} from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/auth";
import { logServerError } from "@/lib/security/log-server-error";
import { getCorrelationId } from "@/lib/security/request-security";
const updateRegionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(10_000).nullable().optional(),
  status: z.enum(["active", "inactive"]),
  image_url: z.url().max(2_048).nullable().optional(),
  image_asset_id: z.uuid().nullable().optional(),
}).strict();

function isTrustedImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "ik.imagekit.io";
  } catch {
    return false;
  }
}

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  const correlationId = getCorrelationId(request);
  try {
    if (!(await hasPermission("regions.update"))) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { id } = await params;

    if (!z.uuid().safeParse(id).success) {
      return NextResponse.json(
        {
          error: "A valid region ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const parsed = updateRegionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid region data." }, { status: 400 });
    }
    const { name, slug, status } = parsed.data;
    const description = parsed.data.description || null;
    let imageUrl = parsed.data.image_url || null;
    const imageAssetId = parsed.data.image_asset_id || null;
    if (imageUrl && !isTrustedImageUrl(imageUrl)) {
      return NextResponse.json({ error: "Select an image from the Media Library." }, { status: 400 });
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
        .select("id,original_url")
        .eq("id", imageAssetId)
        .eq("status", "active")
        .maybeSingle();

      if (mediaAssetError) {
        logServerError("Media asset validation failed.", mediaAssetError, correlationId);

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
      // Bind the URL to the selected row instead of trusting a second client-
      // supplied identifier that could reference unrelated external content.
      imageUrl = mediaAsset.original_url;
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
      .select("id")
      .single();

    if (error) {
      logServerError("Region update failed.", error, correlationId);

      return NextResponse.json(
        {
          error: "Failed to update region.",
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
    logServerError("Region PATCH route failed.", error, correlationId);

    return NextResponse.json(
      {
        error: "Internal server error.",
      },
      {
        status: 500,
      }
    );
  }
}
