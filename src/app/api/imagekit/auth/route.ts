import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Direct browser uploads are disabled. Use the secure media upload endpoint." },
    { status: 410 },
  );
}
