"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getLevel } from "@/lib/level";
import type { User } from "@supabase/supabase-js";

type Profile = { points: number; is_admin: boolean; name: string | null };

function MakaLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="34" fill="#85B7EB" />
      <path
        d="M46 45 v16 M53 45 v16 M60 45 v16 M46 45 a2 2 0 0 0 -2 2 v8 a8 8 0 0 0 8 8 v10 M60 45 v30"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M74 45 v18 a4 4 0 0 1 -4 4 v22 M74 45 a4 4 0 0 0 -4 4 v9"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

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
        <Link href="/" className="text-white font-medium text-lg tracking-tight flex items-center gap-2">
          <MakaLogo />
          MAKA
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          {profile?.is_admin && (
            <Link href="/leaderboard" className="text-white/80 hover:text-white">
              Leaderboard
            </Link>
          )}

          {user ? (
            <>
              <Link href="/places/new" className="btn-primary px-3 py-1.5 text-sm">
                Add a place
              </Link>
              <Link href="/mypage" className="text-white/80 hover:text-white flex items-center gap-1">
                <span className="tag bg-brand-blue text-white">
                  {profile ? getLevel(profile.points) : "..."}
                </span>
              </Link>
              {profile?.is_admin && (
                <>
                  <Link href="/admin/bulk-upload" className="tag bg-brand-blueLight text-brand-blueDark">
                    Bulk upload
                  </Link>
                  <Link href="/admin/settings" className="tag bg-brand-blueLight text-brand-blueDark">
                    Site settings
                  </Link>
                  <Link href="/admin/places" className="tag bg-brand-blueLight text-brand-blueDark">
                    Manage places
                  </Link>
                  <Link href="/admin/visitors" className="tag bg-brand-blueLight text-brand-blueDark">
                    Visitors
                  </Link>
                </>
              )}
              <button onClick={signOut} className="text-white/60 hover:text-white text-xs">
                Sign out
              </button>
            </>
          ) : (
            <button onClick={signInWithGoogle} className="btn-primary px-3 py-1.5 text-sm">
              Sign in with Google
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
