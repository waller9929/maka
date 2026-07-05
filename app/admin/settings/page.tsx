import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SiteSettingsForm from "@/components/SiteSettingsForm";

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
    .select("home_title")
    .eq("id", 1)
    .single();

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-lg font-medium mb-4">Site settings</h1>
      <SiteSettingsForm initialTitle={settings?.home_title ?? "MAKA - Work Hard, Eat Well"} />
    </div>
  );
}
