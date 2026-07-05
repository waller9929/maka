"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function MonthlyMenuPage() {
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [mealPlanUrl, setMealPlanUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    setChecking(true);
    setError("");
    const { data, error: rpcError } = await supabase.rpc("get_meal_plan", {
      input_password: password,
    });
    setChecking(false);
    if (rpcError) {
      setError("Something went wrong. Try again.");
      return;
    }
    if (!data) {
      setError("Incorrect password.");
      return;
    }
    setMealPlanUrl(data as string);
  }

  const isImage = mealPlanUrl ? /\.(png|jpe?g|gif|webp)$/i.test(mealPlanUrl) : false;

  return (
    <div className="max-w-md mx-auto py-10">
      {!mealPlanUrl ? (
        <form onSubmit={handleSubmit} className="card p-6 space-y-3">
          <p className="text-sm font-medium">This month's meal plan</p>
          <p className="text-xs text-brand-gray">Enter the password to view it.</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full"
            autoFocus
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={checking} className="btn-primary w-full py-2 text-sm">
            {checking ? "Checking..." : "View"}
          </button>
        </form>
      ) : (
        <div className="card overflow-hidden">
          {isImage ? (
            <img src={mealPlanUrl} alt="Monthly meal plan" className="w-full" />
          ) : (
            <div className="p-6 text-center">
              <p className="text-sm mb-3">The meal plan is ready.</p>
              <a
                href={mealPlanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary px-4 py-2 text-sm inline-block"
              >
                Open file
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
