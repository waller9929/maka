"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES, PRICE_RANGES, TIME_TAGS, COMPANION_TAGS } from "@/lib/level";
import StarRating from "./StarRating";
import type { User } from "@supabase/supabase-js";

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export type PlaceDetailData = {
  id: string;
  name: string;
  location: string | null;
  category: string;
  rating: number;
  value_rating: number;
  price_range: string | null;
  visit_date: string | null;
  photo_url: string | null;
  menu_photo_url: string | null;
  time_tags: string[];
  companion_tags: string[];
  comment: string | null;
  created_by: string;
  recommender_name: string | null;
};

export default function PlaceDetail({ initial }: { initial: PlaceDetailData }) {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [place, setPlace] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
  }, [supabase]);

  useEffect(() => {
    if (!user) return setIsAdmin(false);
    supabase.from("profiles").select("is_admin").eq("id", user.id).single()
      .then(({ data }) => setIsAdmin(!!data?.is_admin));
  }, [user, supabase]);

  const isOwner = user?.id === place.created_by;

  async function saveChanges() {
    setSaving(true);
    const { error } = await supabase
      .from("places")
      .update({
        name: form.name,
        location: form.location,
        category: form.category,
        rating: form.rating,
        value_rating: form.value_rating,
        price_range: form.price_range,
        visit_date: form.visit_date,
        time_tags: form.time_tags,
        companion_tags: form.companion_tags,
        comment: form.comment,
        updated_at: new Date().toISOString(),
      })
      .eq("id", place.id);
    setSaving(false);
    if (!error) {
      setPlace(form);
      setEditing(false);
      router.refresh();
    }
  }

  async function deletePlace() {
    if (!confirm("이 맛집을 삭제하시겠습니까? 되돌릴 수 없습니다.")) return;
    await supabase.from("places").delete().eq("id", place.id);
    router.push("/");
    router.refresh();
  }

  if (editing) {
    return (
      <div className="card p-5 space-y-3">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full" />
        <input value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full" placeholder="위치" />
        <div className="grid grid-cols-2 gap-3">
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={form.price_range ?? ""} onChange={(e) => setForm({ ...form, price_range: e.target.value })} className="w-full">
            {PRICE_RANGES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input type="number" min={1} max={5} step={0.1} value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} className="w-full" />
          <input type="number" min={1} max={5} step={0.1} value={form.value_rating} onChange={(e) => setForm({ ...form, value_rating: Number(e.target.value) })} className="w-full" />
        </div>
        <div className="flex gap-2">
          {TIME_TAGS.map((t) => (
            <button type="button" key={t} onClick={() => setForm({ ...form, time_tags: toggle(form.time_tags, t) })}
              className={`tag border ${form.time_tags.includes(t) ? "bg-brand-blue text-white border-brand-blue" : "border-brand-gray text-brand-gray"}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {COMPANION_TAGS.map((t) => (
            <button type="button" key={t} onClick={() => setForm({ ...form, companion_tags: toggle(form.companion_tags, t) })}
              className={`tag border ${form.companion_tags.includes(t) ? "bg-brand-blue text-white border-brand-blue" : "border-brand-gray text-brand-gray"}`}>
              {t}
            </button>
          ))}
        </div>
        <textarea value={form.comment ?? ""} onChange={(e) => setForm({ ...form, comment: e.target.value })} className="w-full" rows={3} />
        <div className="flex gap-2">
          <button onClick={saveChanges} disabled={saving} className="btn-primary px-4 py-2 text-sm">
            {saving ? "저장 중..." : "저장"}
          </button>
          <button onClick={() => { setEditing(false); setForm(place); }} className="btn-outline px-4 py-2 text-sm">
            취소
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="h-56 bg-brand-bg relative">
        {place.photo_url ? (
          <Image src={place.photo_url} alt={place.name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand-gray text-sm">사진 없음</div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-medium">{place.name}</h1>
            <p className="text-sm text-brand-gray mt-1">
              {place.category} · {place.location ?? "위치 미입력"} · {place.price_range}
            </p>
          </div>
          <div className="text-right">
            <StarRating value={place.rating} />
            <p className="text-xs text-brand-gray mt-1">가성비 ★ {Number(place.value_rating ?? 0).toFixed(1)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-3">
          {place.time_tags.map((t) => <span key={t} className="tag bg-brand-blueLight text-brand-blueDark">{t}</span>)}
          {place.companion_tags.map((t) => <span key={t} className="tag bg-brand-bg text-brand-gray">{t}</span>)}
        </div>

        {place.comment && <p className="text-sm mt-3">{place.comment}</p>}

        <p className="text-xs text-brand-gray mt-3">
          {place.recommender_name ? `${place.recommender_name} 추천` : ""}
          {place.visit_date ? ` · 방문일 ${place.visit_date}` : ""}
        </p>

        {place.menu_photo_url && (
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">메뉴판</p>
            <div className="relative w-full h-64 bg-brand-bg rounded-card overflow-hidden">
              <Image src={place.menu_photo_url} alt="메뉴판" fill className="object-contain" />
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-4">
          {isOwner && (
            <button onClick={() => setEditing(true)} className="text-sm text-brand-blue">
              수정
            </button>
          )}
          {isAdmin && (
            <button onClick={deletePlace} className="text-sm text-red-600">
              삭제(관리자)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
