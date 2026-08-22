import { NextResponse } from "next/server";

import {
  getImageKitUploadAuth,
} from "@/lib/imagekit/imagekit";

export async function GET() {
  try {
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