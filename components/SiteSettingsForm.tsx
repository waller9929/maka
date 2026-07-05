"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SiteSettingsForm({ initialTitle }: { initialTitle: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    const { error: updateError } = await supabase
      .from("app_settings")
      .update({ home_title: title.trim() || "MAKA", updated_at: new Date().toISOString() })
      .eq("id", 1);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="card p-5 space-y-3">
      <div>
        <label className="text-sm font-medium block mb-1">Homepage title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full"
          placeholder="MAKA - Work Hard, Eat Well"
        />
        <p className="text-xs text-brand-gray mt-1">
          Shown at the top of the homepage for everyone.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && !error && <p className="text-sm text-brand-blue">Saved.</p>}

      <button onClick={handleSave} disabled={saving} className="btn-primary px-4 py-2 text-sm">
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
