"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { type Lang, translate } from "./i18n";

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const COOKIE_NAME = "maka_lang";

function isLang(value: string | undefined): value is Lang {
  return value === "en" || value === "ko" || value === "id";
}

function readInitialLang(): Lang {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`));
  const fromCookie = match?.[1];
  if (isLang(fromCookie)) return fromCookie;
  return "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Runs once on mount — the cookie isn't available during the server
  // render, so the very first paint is English and then snaps to the
  // saved preference. A small tradeoff for not needing an npm i18n library.
  useEffect(() => {
    setLangState(readInitialLang());
  }, []);

  function setLang(next: Lang) {
    setLangState(next);
    document.cookie = `${COOKIE_NAME}=${next}; path=/; max-age=31536000`;
  }

  const value: LanguageContextValue = {
    lang,
    setLang,
    t: (key: string) => translate(lang, key),
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
