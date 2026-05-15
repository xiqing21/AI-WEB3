import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownBody } from "@/components/posts/markdown-body";
import { SubscribeButton } from "@/components/wallet/subscribe-button";
import { getUser } from "@/lib/auth";
import { getCoverUrl } from "@/lib/images";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getLocale();
  const t = getDictionary(locale);
  const supabase = await createClient();
  const user = await getUser();

  const { data: publicPost } = await supabase
    .from("public_posts")
    .select("id,title,cover_path,created_at,creator_id")
    .eq("id", id)
    .single();

  if (!publicPost) {
    notFound();
  }

  const [{ data: bodyPost }, { data: creator }, { data: price }] =
    await Promise.all([
      supabase.from("posts").select("body").eq("id", id).maybeSingle(),
      supabase
        .from("profiles")
        .select("id,display_name,wallet_address")
        .eq("id", publicPost.creator_id)
        .single(),
      supabase
        .from("creator_pass_prices")
        .select("price_mon")
        .eq("creator_id", publicPost.creator_id)
        .maybeSingle(),
    ]);

  const canReadBody = Boolean(bodyPost?.body);
  const canSubscribe = Boolean(user && user.id !== publicPost.creator_id);

  return (
    <main className="page-shell">
      <article className="reader-panel">
        <p className="eyebrow">
          <Link href={`/creators/${publicPost.creator_id}`}>
            {creator?.display_name ?? t.creatorProfile}
          </Link>
        </p>
        <h1>{publicPost.title}</h1>
        <time>{new Date(publicPost.created_at).toLocaleString()}</time>
        {publicPost.cover_path ? (
          <Image
            alt=""
            className="post-cover"
            height={675}
            src={getCoverUrl(publicPost.cover_path) ?? ""}
            width={1200}
          />
        ) : null}

        {canReadBody ? (
          <MarkdownBody body={bodyPost?.body ?? ""} />
        ) : (
          <div className="paywall">
            <h2>{t.paidBodyLocked}</h2>
            <p>{t.paywallCopy}</p>
            {user ? (
              canSubscribe ? (
                <SubscribeButton
                  creatorId={publicPost.creator_id}
                  creatorWallet={creator?.wallet_address ?? null}
                  priceMon={String(price?.price_mon ?? "0.1")}
                  locale={locale}
                />
              ) : (
                <p className="muted">{t.yourPost}</p>
              )
            ) : (
              <Link className="clay-button clay-button-primary" href="/sign-in">
                {t.signInToSubscribe}
              </Link>
            )}
          </div>
        )}
      </article>
    </main>
  );
}
