import { WritePostForm } from "@/components/posts/write-post-form";
import { requireAuth } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";

export default async function WritePage() {
  await requireAuth();
  const locale = await getLocale();

  return (
    <main className="page-shell">
      <WritePostForm locale={locale} />
    </main>
  );
}
