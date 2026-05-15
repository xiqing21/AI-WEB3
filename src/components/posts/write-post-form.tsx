"use client";

import { useActionState } from "react";
import { createPost } from "@/app/actions";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";

export function WritePostForm({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const [state, formAction, pending] = useActionState(createPost, null);

  return (
    <form action={formAction} className="write-panel">
      <div>
        <p className="eyebrow">{t.creatorStudio}</p>
        <h1>{t.writeBriefing}</h1>
      </div>

      <label>
        {t.title}
        <input
          name="title"
          maxLength={140}
          placeholder="What changed in Web3 infra this week?"
          required
        />
      </label>

      <label>
        {t.coverJpg}
        <input name="cover" type="file" accept="image/jpeg,.jpg,.jpeg" required />
      </label>

      <label>
        {t.priceMon}
        <input
          name="price_mon"
          type="number"
          min="0"
          step="0.0001"
          defaultValue="0.1"
          required
        />
      </label>

      <label>
        {t.body}
        <textarea
          name="body"
          rows={14}
          placeholder={t.bodyPlaceholder}
          required
        />
      </label>

      {state?.error ? <p className="error-box">{state.error}</p> : null}

      <button className="clay-button clay-button-primary" disabled={pending}>
        {pending ? t.publishing : t.publishNow}
      </button>
    </form>
  );
}
