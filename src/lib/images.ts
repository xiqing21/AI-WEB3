import { createClient } from "@/lib/supabase/client";

export function getCoverUrl(path: string | null) {
  if (!path) {
    return null;
  }

  const supabase = createClient();
  return supabase.storage.from("post-covers").getPublicUrl(path).data.publicUrl;
}
