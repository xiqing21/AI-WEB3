"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

export function AppControls({
  locale,
  languageLabel,
  darkLabel,
  lightLabel,
}: {
  locale: Locale;
  languageLabel: string;
  darkLabel: string;
  lightLabel: string;
}) {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") {
      return "light";
    }
    return localStorage.getItem("monograph-theme") === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function switchLocale() {
    const nextLocale = locale === "zh" ? "en" : "zh";
    document.cookie = `monograph-locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  }

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("monograph-theme", nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }

  return (
    <div className="app-controls">
      <button type="button" onClick={switchLocale}>
        {languageLabel}
      </button>
      <button type="button" onClick={toggleTheme}>
        {theme === "dark" ? lightLabel : darkLabel}
      </button>
    </div>
  );
}
