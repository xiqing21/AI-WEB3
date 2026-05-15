import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { requireGuest } from "@/lib/auth";
import { getLocale } from "@/lib/i18n-server";

export default async function SignUpPage() {
  await requireGuest();
  const locale = await getLocale();

  return (
    <main className="auth-shell">
      <Suspense>
        <AuthForm mode="sign-up" locale={locale} />
      </Suspense>
    </main>
  );
}
