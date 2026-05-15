"use client";

import Link from "next/link";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";

type FeedPost = {
  id: string;
  title: string;
  cover_path: string | null;
  created_at: string;
};

export function LoadMorePosts({
  creatorId,
  initialPosts,
  locale,
}: {
  creatorId: string;
  initialPosts: FeedPost[];
  locale: Locale;
}) {
  const t = getDictionary(locale);
  const [posts, setPosts] = useState(initialPosts);
  const [hasMore, setHasMore] = useState(initialPosts.length === 20);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    setIsLoading(true);
    setError(null);

    const response = await fetch(
      `/api/creators/${creatorId}/posts?offset=${posts.length}`,
    );
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Could not load more posts.");
      setIsLoading(false);
      return;
    }

    setPosts((current) => [...current, ...payload.posts]);
    setHasMore(payload.posts.length === 20);
    setIsLoading(false);
  }

  return (
    <div className="feed-stack">
      <div className="post-grid">
        {posts.map((post) => (
          <Link className="post-card" href={`/posts/${post.id}`} key={post.id}>
            <div className="post-card-image">
              {post.cover_path ? <span>{post.title.slice(0, 1)}</span> : null}
            </div>
            <div>
              <time>{new Date(post.created_at).toLocaleDateString()}</time>
              <h3>{post.title}</h3>
            </div>
          </Link>
        ))}
      </div>

      {error ? <p className="error-box">{error}</p> : null}

      {hasMore ? (
        <button
          className="clay-button"
          disabled={isLoading}
          onClick={loadMore}
          type="button"
        >
          {isLoading ? t.loading : t.loadMore}
        </button>
      ) : null}
    </div>
  );
}
