"use client";

import { useLanguage } from "@/lib/i18n-context";
import { LANGUAGES } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex items-center gap-0.5 bg-white/10 rounded-card p-0.5">
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
            lang === l.code ? "bg-white text-brand-black" : "text-white/60 hover:text-white"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
