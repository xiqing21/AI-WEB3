"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Locale } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n";

type AuthMode = "sign-in" | "sign-up";

export function AuthForm({ mode, locale }: { mode: AuthMode; locale: Locale }) {
  const t = getDictionary(locale);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirectTo") ?? "/";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    const supabase = createClient();
    const response =
      mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                display_name: displayName,
                wallet_address: walletAddress,
              },
            },
          });

    if (response.error) {
      setError(response.error.message);
      setIsPending(false);
      return;
    }

    router.push(mode === "sign-in" ? redirectTo : "/write");
    router.refresh();
  }

  const isSignUp = mode === "sign-up";

  return (
    <form className="auth-card" onSubmit={onSubmit}>
      <div className="space-y-3">
        <p className="eyebrow">{t.authEyebrow}</p>
        <h1>{isSignUp ? t.signUpTitle : t.signInTitle}</h1>
        <p className="muted">
          {isSignUp ? t.signUpCopy : t.signInCopy}
        </p>
      </div>

      {isSignUp ? (
        <>
          <label>
            {t.displayName}
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Ada of the chain"
              required
            />
          </label>
          <label>
            {t.walletAddress}
            <input
              value={walletAddress}
              onChange={(event) => setWalletAddress(event.target.value)}
              placeholder="0x..."
              required
            />
          </label>
        </>
      ) : null}

      <label>
        {t.email}
        <input
          autoComplete="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label>
        {t.password}
        <input
          autoComplete={isSignUp ? "new-password" : "current-password"}
          type="password"
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>

      {error ? <p className="error-box">{error}</p> : null}

      <button className="clay-button clay-button-primary" disabled={isPending}>
        {isPending ? t.working : isSignUp ? t.navSignUp : t.navSignIn}
      </button>

      <p className="muted text-sm">
        {isSignUp ? t.alreadyPublishing : t.needAccount}{" "}
        <Link href={isSignUp ? "/sign-in" : "/sign-up"}>
          {isSignUp ? t.navSignIn : t.navSignUp}
        </Link>
      </p>
    </form>
  );
}
