"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getLevel } from "@/lib/level";
import type { User } from "@supabase/supabase-js";

type Profile = { points: number; is_admin: boolean; name: string | null };

export default function Navbar() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    supabase
      .from("profiles")
      .select("points, is_admin, name")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setProfile(data as Profile));
  }, [user, supabase]);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-10 bg-brand-black">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-white font-medium text-lg tracking-tight">
          MAKA
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/leaderboard" className="text-white/80 hover:text-white">
            리더보드
          </Link>

          {user ? (
            <>
              <Link href="/places/new" className="btn-primary px-3 py-1.5 text-sm">
                맛집 추천하기
              </Link>
              <Link href="/mypage" className="text-white/80 hover:text-white flex items-center gap-1">
                <span className="tag bg-brand-blue text-white">
                  {profile ? getLevel(profile.points) : "..."}
                </span>
              </Link>
              {profile?.is_admin && (
                <span className="tag bg-brand-blueLight text-brand-blueDark">관리자</span>
              )}
              <button onClick={signOut} className="text-white/60 hover:text-white text-xs">
                로그아웃
              </button>
            </>
          ) : (
            <button onClick={signInWithGoogle} className="btn-primary px-3 py-1.5 text-sm">
              구글 로그인
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
