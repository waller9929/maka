"use client";

import { useLanguage } from "@/lib/i18n-context";

// Drop-in translator for use inside otherwise-server-rendered pages —
// e.g. <T k="todays_picks" /> — without converting the whole page to a
// client component.
export default function T({ k }: { k: string }) {
  const { t } = useLanguage();
  return <>{t(k)}</>;
}
