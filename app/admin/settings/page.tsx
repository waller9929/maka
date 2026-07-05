import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SiteSettingsForm from "@/components/SiteSettingsForm";
import SecretPageSettingsForm from "@/components/SecretPageSettingsForm";

export const dynamic = "force-dynamic";

export default async function SiteSettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  const { data: settings } = await supabase
    .from("app_settings")
    .select("home_title, visit_count")
    .eq("id", 1)
    .single();

  const { data: secretPage } = await supabase
    .from("secret_page")
    .select("meal_plan_url")
    .eq("id", 1)
    .single();

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="text-lg font-medium mb-4">Site settings</h1>
      <SiteSettingsForm
        initialTitle={settings?.home_title ?? "MAKA - Work Hard, Eat Well"}
        visitCount={settings?.visit_count ?? 0}
      />
      <SecretPageSettingsForm currentMealPlanUrl={secretPage?.meal_plan_url ?? null} />
    </div>
  );
}
