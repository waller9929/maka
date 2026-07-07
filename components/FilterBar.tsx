"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CATEGORIES, TIME_TAGS, COMPANION_TAGS } from "@/lib/level";
import { INDONESIA_CITIES } from "@/lib/region";
import { useLanguage } from "@/lib/i18n-context";

export default function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const category = searchParams.get("category") ?? "";
  const time = searchParams.get("time") ?? "";
  const companion = searchParams.get("companion") ?? "";
  const q = searchParams.get("q") ?? "";
  const region = searchParams.get("region") ?? "";
  const city = searchParams.get("city") ?? "";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key === "region") params.delete("city");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-3 mb-5">
      <input
        type="text"
        placeholder={t("search_placeholder")}
        defaultValue={q}
        onKeyDown={(e) => {
          if (e.key === "Enter") updateParam("q", (e.target as HTMLInputElement).value);
        }}
        className="w-full sm:w-72"
      />

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => updateParam("category", "")}
          className={`tag border ${category === "" ? "bg-brand-blue text-white border-brand-blue" : "border-brand-gray text-brand-gray"}`}
        >
          {t("all")}
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => updateParam("category", c)}
            className={`tag border ${category === c ? "bg-brand-blue text-white border-brand-blue" : "border-brand-gray text-brand-gray"}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex gap-2 items-center">
          <span className="text-xs text-brand-gray">{t("time")}</span>
          {TIME_TAGS.map((t) => (
            <button
              key={t}
              onClick={() => updateParam("time", time === t ? "" : t)}
              className={`tag border ${time === t ? "bg-brand-blueLight text-brand-blueDark border-brand-blue" : "border-brand-gray text-brand-gray"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-brand-gray">{t("with")}</span>
          {COMPANION_TAGS.map((t) => (
            <button
              key={t}
              onClick={() => updateParam("companion", companion === t ? "" : t)}
              className={`tag border ${companion === t ? "bg-brand-blueLight text-brand-blueDark border-brand-blue" : "border-brand-gray text-brand-gray"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex gap-2 items-center">
          <span className="text-xs text-brand-gray">{t("region")}</span>
          <button
            onClick={() => updateParam("region", "")}
            className={`tag border ${region === "" ? "bg-brand-blue text-white border-brand-blue" : "border-brand-gray text-brand-gray"}`}
          >
            {t("all")}
          </button>
          <button
            onClick={() => updateParam("region", "Indonesia")}
            className={`tag border ${region === "Indonesia" ? "bg-brand-blue text-white border-brand-blue" : "border-brand-gray text-brand-gray"}`}
          >
            Indonesia
          </button>
          <button
            onClick={() => updateParam("region", "Other")}
            className={`tag border ${region === "Other" ? "bg-brand-blue text-white border-brand-blue" : "border-brand-gray text-brand-gray"}`}
          >
            Other
          </button>
        </div>

        {region === "Indonesia" && (
          <div className="flex gap-2 items-center flex-wrap">
            <span className="text-xs text-brand-gray">{t("city")}</span>
            {INDONESIA_CITIES.map((c) => (
              <button
                key={c.label}
                onClick={() => updateParam("city", city === c.label ? "" : c.label)}
                className={`tag border ${city === c.label ? "bg-brand-blueLight text-brand-blueDark border-brand-blue" : "border-brand-gray text-brand-gray"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
