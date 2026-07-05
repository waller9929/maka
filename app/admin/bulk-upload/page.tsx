import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BulkUploadForm from "@/components/BulkUploadForm";

export const dynamic = "force-dynamic";

export default async function BulkUploadPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-lg font-medium mb-4">Bulk upload places</h1>
      <p className="text-sm text-brand-gray mb-4">
        Import many places at once from a CSV file — handy for bringing in a Google Maps
        saved list. Export your list with{" "}
        <a
          href="https://takeout.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-blue underline"
        >
          Google Takeout
        </a>{" "}
        first, then fill in the CSV template below.
      </p>
      <BulkUploadForm />
    </div>
  );
}
