"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SecretPageSettingsForm({
  currentMealPlanUrl,
}: {
  currentMealPlanUrl: string | null;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      let meal_plan_url = currentMealPlanUrl;
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `meal-plan/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("place-photos").upload(path, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("place-photos").getPublicUrl(path);
        meal_plan_url = data.publicUrl;
      }

      const update: Record<string, string> = { updated_at: new Date().toISOString() };
      if (newPassword.trim()) update.password = newPassword.trim();
      if (meal_plan_url && meal_plan_url !== currentMealPlanUrl) update.meal_plan_url = meal_plan_url;

      const { error: updateError } = await supabase.from("secret_page").update(update).eq("id", 1);
      if (updateError) throw updateError;

      setSaved(true);
      setNewPassword("");
      setFile(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-5 space-y-3">
      <p className="text-sm font-medium">Hidden monthly meal plan page</p>
      <p className="text-xs text-brand-gray">
        There's a small hidden spot in the bottom-right corner of the homepage that links to a
        password-protected page showing this file.
      </p>

      <div>
        <label className="text-sm font-medium block mb-1">New password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Leave blank to keep the current password"
          className="w-full"
        />
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">Meal plan image/file</label>
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        {currentMealPlanUrl && !file && (
          <p className="text-xs text-brand-gray mt-1">
            Currently set —{" "}
            <a href={currentMealPlanUrl} target="_blank" rel="noopener noreferrer" className="text-brand-blue underline">
              view current file
            </a>
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && !error && <p className="text-sm text-brand-blue">Saved.</p>}

      <button onClick={handleSave} disabled={saving} className="btn-primary px-4 py-2 text-sm">
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
