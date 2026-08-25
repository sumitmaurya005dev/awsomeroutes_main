import { NextRequest, NextResponse } from "next/server";

import { isMediaLibraryFolder } from "@/config/media";
import { hasPermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function positiveInteger(value: string | null, fallback: number, maximum: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

export async function GET(request: NextRequest) {
  try {
    if (!(await hasPermission("media.view"))) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = positiveInteger(searchParams.get("page"), 1, 10_000);
    const pageSize = positiveInteger(searchParams.get("pageSize"), 24, 100);
    const search = searchParams.get("search")?.trim().slice(0, 100) ?? "";
    const folder = searchParams.get("folder")?.trim() ?? "";
    if (folder && !isMediaLibraryFolder(folder)) {
      return NextResponse.json({ error: "Invalid media folder." }, { status: 400 });
    }

    const supabase = await createClient();
    const from = (page - 1) * pageSize;
    let query = supabase
      .from("media_assets")
      .select("id,original_url,file_name,original_file_name,folder,alt_text,width,height,created_at", { count: "exact" })
      .eq("status", "active")
      .eq("media_type", "image")
      .neq("folder", "/awesomeroutes/profiles")
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (folder) query = query.eq("folder", folder);
    if (search) query = query.ilike("file_name", `%${search.replace(/[%_(),]/g, "")}%`);
    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({ data: data ?? [], count: count ?? 0, page, pageSize });
  } catch (error) {
    console.error("Fetch media assets error:", error);
    return NextResponse.json({ error: "Failed to load Media Library." }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json(
    { error: "Client-provided ImageKit metadata is no longer accepted. Use /api/media/upload." },
    { status: 410 },
  );
}
