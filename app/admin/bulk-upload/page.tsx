import BulkUploadForm from "@/components/BulkUploadForm";

export const dynamic = "force-dynamic";

export default async function BulkUploadPage() {
  return (
    <div>
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
