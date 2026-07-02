"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CATEGORIES, TIME_TAGS, COMPANION_TAGS } from "@/lib/level";

export default function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const category = searchParams.get("category") ?? "";
  const time = searchParams.get("time") ?? "";
  const companion = searchParams.get("companion") ?? "";
  const q = searchParams.get("q") ?? "";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-3 mb-5">
      <input
        type="text"
        placeholder="가게명, 지역으로 검색"
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
          전체
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
          <span className="text-xs text-brand-gray">시간대</span>
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
          <span className="text-xs text-brand-gray">함께</span>
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
    </div>
  );
}
