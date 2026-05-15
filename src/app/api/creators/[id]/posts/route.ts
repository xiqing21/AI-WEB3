import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const offset = Number(request.nextUrl.searchParams.get("offset") ?? "0");

  if (!Number.isInteger(offset) || offset < 0) {
    return NextResponse.json({ error: "Invalid offset." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("public_posts")
    .select("id,title,cover_path,created_at")
    .eq("creator_id", id)
    .order("created_at", { ascending: false })
    .range(offset, offset + 19);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ posts: data ?? [] });
}
