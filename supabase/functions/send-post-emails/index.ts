import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "npm:resend@4.0.0";

function escapeHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function preview(body: string) {
  const normalized = body.replace(/\s+/g, " ").trim();
  return normalized.length > 180 ? `${normalized.slice(0, 180)}...` : normalized;
}

serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const expectedSecret = Deno.env.get("EMAIL_FUNCTION_SECRET");
  if (expectedSecret && request.headers.get("x-function-secret") !== expectedSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { post_id } = await request.json();
  if (!post_id) {
    return new Response("Missing post_id", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);
  const appUrl = Deno.env.get("SITE_URL") ?? "http://localhost:3000";

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id,title,body,cover_path,creator_id,profiles!posts_creator_id_fkey(display_name)")
    .eq("id", post_id)
    .single();

  if (postError || !post) {
    return Response.json({ error: postError?.message ?? "Post not found" }, { status: 404 });
  }

  const { data: subscribers, error: subscriberError } = await supabase
    .rpc("subscriber_emails_for_creator", { p_creator_id: post.creator_id });

  if (subscriberError) {
    return Response.json({ error: subscriberError.message }, { status: 500 });
  }

  const emails = [...new Set(subscribers?.map((row) => row.email).filter(Boolean) ?? [])];

  const title = escapeHtml(post.title);
  const creator = escapeHtml(post.profiles?.display_name ?? "A creator");
  const safePreview = escapeHtml(preview(post.body));
  const postUrl = `${appUrl}/posts/${post.id}`;
  const coverUrl = post.cover_path
    ? `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/post-covers/${post.cover_path}`
    : "";

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2530">
      <p>${creator} published a new paid post.</p>
      <h1>${title}</h1>
      ${coverUrl ? `<img src="${escapeHtml(coverUrl)}" alt="" style="max-width:100%;border-radius:16px" />` : ""}
      <p>${safePreview}</p>
      <p><a href="${escapeHtml(postUrl)}">Read the full post</a></p>
    </div>
  `;

  const chunks = [];
  for (let index = 0; index < emails.length; index += 50) {
    chunks.push(emails.slice(index, index + 50));
  }

  for (const chunk of chunks) {
    await resend.emails.send({
      from: Deno.env.get("RESEND_FROM") ?? "Monograph <onboarding@resend.dev>",
      to: chunk,
      subject: `${post.profiles?.display_name ?? "Creator"}: ${post.title}`,
      html,
    });
  }

  return Response.json({ sent: emails.length });
});
