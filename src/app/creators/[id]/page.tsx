import { notFound } from "next/navigation";
import { LoadMorePosts } from "@/components/posts/load-more-posts";
import { SubscribeButton } from "@/components/wallet/subscribe-button";
import { getUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";

export default async function CreatorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getLocale();
  const t = getDictionary(locale);
  const supabase = await createClient();
  const user = await getUser();

  const [{ data: profile }, { data: posts }, { data: price }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id,display_name,wallet_address")
        .eq("id", id)
        .single(),
      supabase
        .from("public_posts")
        .select("id,title,cover_path,created_at")
        .eq("creator_id", id)
        .order("created_at", { ascending: false })
        .range(0, 19),
      supabase
        .from("creator_pass_prices")
        .select("price_mon")
        .eq("creator_id", id)
        .maybeSingle(),
    ]);

  if (!profile) {
    notFound();
  }

  const { data: subscription } =
    user && user.id !== id
      ? await supabase
          .from("subscriptions")
          .select("id")
          .eq("subscriber_id", user.id)
          .eq("creator_id", id)
          .maybeSingle()
      : { data: null };

  const shouldShowSubscribe = Boolean(user && user.id !== id && !subscription);
  const priceMon = String(price?.price_mon ?? "0.1");

  return (
    <main className="page-shell">
      <section className="creator-header">
        <div>
          <p className="eyebrow">{t.creatorProfile}</p>
          <h1>{profile.display_name ?? "Untitled creator"}</h1>
          <p className="muted">
            {profile.wallet_address
              ? `${t.walletAddress}: ${profile.wallet_address}`
              : t.walletMissing}
          </p>
        </div>
        {shouldShowSubscribe ? (
          <SubscribeButton
            creatorId={id}
            creatorWallet={profile.wallet_address}
            priceMon={priceMon}
            locale={locale}
          />
        ) : null}
      </section>

      <section className="section-band">
        <div className="section-heading">
          <p className="eyebrow">{t.creatorFeed}</p>
          <h2>{t.newestFirst}</h2>
        </div>
        <LoadMorePosts creatorId={id} initialPosts={posts ?? []} locale={locale} />
      </section>
    </main>
  );
}
