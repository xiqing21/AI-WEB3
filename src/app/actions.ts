"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

export async function createPost(
  _previousState: { error: string } | null,
  formData: FormData,
) {
  const user = await requireAuth();
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const price = Number(formData.get("price_mon") ?? 0);
  const cover = formData.get("cover") as File | null;

  if (!title || title.length > 140) {
    return { error: "Title is required and must stay under 140 characters." };
  }

  if (!body) {
    return { error: "Body cannot be empty." };
  }

  if (!Number.isFinite(price) || price < 0) {
    return { error: "Price must be a number greater than or equal to 0 MON." };
  }

  if (!cover || cover.size === 0 || cover.type !== "image/jpeg") {
    return { error: "Cover image must be a JPG file." };
  }

  const coverPath = `${user.id}/${Date.now()}.jpg`;
  const upload = await supabase.storage
    .from("post-covers")
    .upload(coverPath, cover, {
      cacheControl: "3600",
      contentType: "image/jpeg",
      upsert: false,
    });

  if (upload.error) {
    return { error: upload.error.message };
  }

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      creator_id: user.id,
      title,
      cover_path: coverPath,
      body,
      price_mon: price,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  after(async () => {
    const functionSecret = process.env.EMAIL_FUNCTION_SECRET;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!functionSecret || !supabaseUrl) {
      return;
    }

    await fetch(`${supabaseUrl}/functions/v1/send-post-emails`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-function-secret": functionSecret,
      },
      body: JSON.stringify({ post_id: post.id }),
    }).catch(() => undefined);
  });

  revalidatePath("/");
  revalidatePath(`/creators/${user.id}`);
  redirect(`/posts/${post.id}`);
}
