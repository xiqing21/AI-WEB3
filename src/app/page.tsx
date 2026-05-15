import Image from "next/image";
import Link from "next/link";
import { getCoverUrl } from "@/lib/images";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";

const demoPosts = [
  {
    id: "demo-politics",
    title: "Election data rooms, prediction markets, and the new attention stack",
    theme: "Politics",
    creator_display_name: "Monograph Desk",
  },
  {
    id: "demo-finance",
    title: "Why treasury desks are watching MON liquidity like a rates market",
    theme: "Finance",
    creator_display_name: "Monograph Desk",
  },
  {
    id: "demo-web3",
    title: "The Web3 app layer is moving from wallets to paid relationships",
    theme: "Web3",
    creator_display_name: "Monograph Desk",
  },
  {
    id: "demo-data",
    title: "Big data teams are rebuilding feeds around real-time subscription checks",
    theme: "Big Data",
    creator_display_name: "Monograph Desk",
  },
];

export default async function Home() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("public_posts")
    .select("id,title,cover_path,created_at,creator_id,creator_display_name")
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">{t.heroEyebrow}</p>
          <h1>{t.heroTitle}</h1>
          <p>{t.heroCopy}</p>
          <div className="hero-actions">
            <Link className="clay-button clay-button-primary" href="/write">
              {t.writePost}
            </Link>
            <Link className="clay-button" href="/sign-up">
              {t.becomeCreator}
            </Link>
          </div>
        </div>
      </section>

      <section className="section-band">
        <div className="section-heading">
          <p className="eyebrow">{t.latestFeed}</p>
          <h2>{t.feedSubtitle}</h2>
        </div>
        <div className="post-grid">
          {(posts?.length ? posts : demoPosts).map((post) => (
            <Link
              className="post-card"
              href={"creator_id" in post ? `/posts/${post.id}` : "/sign-up"}
              key={post.id}
            >
              <div className="post-card-image">
                {"cover_path" in post && post.cover_path ? (
                  <Image
                    alt=""
                    fill
                    sizes="(max-width: 760px) 100vw, 33vw"
                    src={getCoverUrl(post.cover_path) ?? ""}
                  />
                ) : (
                  <span>{post.title.slice(0, 1)}</span>
                )}
              </div>
              <div>
                <time>
                  {"created_at" in post
                    ? new Date(post.created_at).toLocaleDateString()
                    : t.seedIdea}
                </time>
                <p className="post-author">
                  {t.byCreator} {post.creator_display_name}
                </p>
                <h3>{post.title}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
