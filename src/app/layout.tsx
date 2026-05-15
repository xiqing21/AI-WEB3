import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans } from "next/font/google";
import Link from "next/link";
import { signOut } from "@/app/actions";
import { Providers } from "@/app/providers";
import { AppControls } from "@/components/app-controls";
import { ConnectWallet } from "@/components/wallet/connect-wallet";
import { getUser } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import "./globals.css";

const bodyFont = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const displayFont = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Monograph",
  description: "Paid newsletters for Monad-native creators.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUser();
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <html
      lang={locale === "zh" ? "zh-CN" : "en"}
      className={`${bodyFont.variable} ${displayFont.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{document.documentElement.dataset.theme=localStorage.getItem('monograph-theme')==='dark'?'dark':'light'}catch(e){}",
          }}
        />
      </head>
      <body>
        <Providers>
          <div className="site-chrome">
            <header className="topbar">
              <Link className="brand" href="/">
                Monograph
              </Link>
              <nav>
                <Link href="/write">{t.navWrite}</Link>
                {user ? (
                  <form action={signOut}>
                    <button type="submit">{t.navSignOut}</button>
                  </form>
                ) : (
                  <>
                    <Link href="/sign-in">{t.navSignIn}</Link>
                    <Link href="/sign-up">{t.navSignUp}</Link>
                  </>
                )}
                <ConnectWallet />
                <AppControls
                  locale={locale}
                  languageLabel={t.language}
                  darkLabel={t.dark}
                  lightLabel={t.light}
                />
              </nav>
            </header>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
