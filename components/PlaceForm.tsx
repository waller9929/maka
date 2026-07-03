"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES, TIME_TAGS, COMPANION_TAGS, PRICE_RANGES } from "@/lib/level";
import type { User } from "@supabase/supabase-js";

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export default function PlaceForm() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [rating, setRating] = useState(5);
  const [valueRating, setValueRating] = useState(5);
  const [priceRange, setPriceRange] = useState<string>(PRICE_RANGES[0]);
  const [visitDate, setVisitDate] = useState("");
  const [timeTags, setTimeTags] = useState<string[]>([]);
  const [companionTags, setCompanionTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [menuFile, setMenuFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
  }, [supabase]);

  async function uploadFile(file: File, prefix: string) {
    const ext = file.name.split(".").pop();
    const path = `${prefix}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("place-photos").upload(path, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("place-photos").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      setError("가게명을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const photo_url = photoFile ? await uploadFile(photoFile, "photos") : null;
      const menu_photo_url = menuFile ? await uploadFile(menuFile, "menus") : null;

      const { data, error: insertError } = await supabase
        .from("places")
        .insert({
          name: name.trim(),
          location: location.trim() || null,
          category,
          rating,
          value_rating: valueRating,
          price_range: priceRange,
          visit_date: visitDate || null,
          time_tags: timeTags,
          companion_tags: companionTags,
          comment: comment.trim() || null,
          photo_url,
          menu_photo_url,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      router.push(`/places/${data.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "등록 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-brand-gray mb-3">맛집을 추천하려면 구글 로그인이 필요합니다.</p>
        <button
          onClick={() =>
            supabase.auth.signInWithOAuth({
              provider: "google",
              options: { redirectTo: `${window.location.origin}/auth/callback?next=/places/new` },
            })
          }
          className="btn-primary px-4 py-2 text-sm"
        >
          구글 로그인
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4">
      <div>
        <label className="text-sm font-medium block mb-1">가게명 *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full" required />
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">위치</label>
        <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full" placeholder="예: 강남역 3번 출구" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium block mb-1">카테고리</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">가격대</label>
          <select value={priceRange} onChange={(e) => setPriceRange(e.target.value)} className="w-full">
            {PRICE_RANGES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium block mb-1">평점 (1~5)</label>
          <input type="number" min={1} max={5} step={0.1} value={rating} onChange={(e) => setRating(Number(e.target.value))} className="w-full" />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">가성비 별점 (1~5)</label>
          <input type="number" min={1} max={5} step={0.1} value={valueRating} onChange={(e) => setValueRating(Number(e.target.value))} className="w-full" />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">방문일</label>
        <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="w-full sm:w-48" />
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">추천 시간대</label>
        <div className="flex gap-2">
          {TIME_TAGS.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setTimeTags(toggle(timeTags, t))}
              className={`tag border ${timeTags.includes(t) ? "bg-brand-blue text-white border-brand-blue" : "border-brand-gray text-brand-gray"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">함께하기 좋은 사람</label>
        <div className="flex gap-2 flex-wrap">
          {COMPANION_TAGS.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setCompanionTags(toggle(companionTags, t))}
              className={`tag border ${companionTags.includes(t) ? "bg-brand-blue text-white border-brand-blue" : "border-brand-gray text-brand-gray"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">사진 업로드</label>
        <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">메뉴판 사진 업로드</label>
        <input type="file" accept="image/*" onChange={(e) => setMenuFile(e.target.files?.[0] ?? null)} />
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">한줄 코멘트</label>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="w-full" rows={3} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5 text-sm">
        {submitting ? "등록 중..." : "맛집 등록하기 (+10점)"}
      </button>
    </form>
  );
}
