import { NextResponse } from "next/server";

import {
  getImageKitUploadAuth,
} from "@/lib/imagekit/imagekit";
import { hasPermission } from "@/lib/auth";

export async function GET() {
  try {
    const canUploadToMediaLibrary = await hasPermission("media.create");

    if (!canUploadToMediaLibrary) {
      return NextResponse.json(
        { error: "You are not allowed to upload to the Media Library." },
        { status: 403 }
      );
    }

    const auth =
      getImageKitUploadAuth();

    return NextResponse.json(auth);
  } catch (error) {
    console.error(
      "ImageKit auth error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to generate ImageKit authentication.",
      },
      {
        status: 500,
      }
    );
  }
}
