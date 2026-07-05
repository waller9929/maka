"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES, mapGoogleTypeToCategory } from "@/lib/level";

type Row = {
  name: string;
  location: string;
  category: string;
  google_maps_url: string;
  comment: string;
};

// Minimal CSV parser that handles quoted fields containing commas.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && next === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function normalizeCategory(raw: string): string {
  const trimmed = raw.trim();
  if ((CATEGORIES as readonly string[]).includes(trimmed)) return trimmed;
  return mapGoogleTypeToCategory([trimmed]);
}

export default function BulkUploadForm() {
  const supabase = createClient();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const [error, setError] = useState("");

  async function handleFile(file: File) {
    setError("");
    setResult(null);
    setFileName(file.name);
    const text = await file.text();
    const table = parseCsv(text);
    if (table.length < 2) {
      setError("The CSV file has no data rows.");
      setRows([]);
      return;
    }
    const header = table[0].map((h) => h.trim().toLowerCase());
    const nameIdx = header.indexOf("name");
    const locationIdx = header.indexOf("location");
    const categoryIdx = header.indexOf("category");
    const urlIdx = header.indexOf("google_maps_url");
    const commentIdx = header.indexOf("comment");

    if (nameIdx === -1) {
      setError('The CSV must have a "name" column.');
      setRows([]);
      return;
    }

    const parsed: Row[] = table.slice(1).map((r) => ({
      name: r[nameIdx]?.trim() ?? "",
      location: locationIdx >= 0 ? r[locationIdx]?.trim() ?? "" : "",
      category: normalizeCategory(categoryIdx >= 0 ? r[categoryIdx] ?? "" : ""),
      google_maps_url: urlIdx >= 0 ? r[urlIdx]?.trim() ?? "" : "",
      comment: commentIdx >= 0 ? r[commentIdx]?.trim() ?? "" : "",
    })).filter((r) => r.name);

    setRows(parsed);
  }

  async function handleImport() {
    setSubmitting(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be signed in.");
      setSubmitting(false);
      return;
    }

    let success = 0;
    let failed = 0;

    for (const row of rows) {
      const { error: insertError } = await supabase.from("places").insert({
        name: row.name,
        location: row.location || null,
        category: row.category,
        base_rating: 0,
        restaurant_type: null,
        time_tags: [],
        companion_tags: [],
        comment: row.comment || null,
        google_maps_url: row.google_maps_url || null,
        created_by: user.id,
      });
      if (insertError) failed++;
      else success++;
    }

    setResult({ success, failed });
    setSubmitting(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <p className="text-sm font-medium mb-2">1. Download the CSV template</p>
        <a
          href="/bulk-upload-template.csv"
          download
          className="btn-outline px-3 py-1.5 text-sm inline-block"
        >
          Download template.csv
        </a>
        <p className="text-xs text-brand-gray mt-2">
          Columns: name (required), location, category, google_maps_url, comment. Ratings and
          tags default to empty and can be filled in per place afterward.
        </p>
      </div>

      <div className="card p-5">
        <p className="text-sm font-medium mb-2">2. Upload your filled-in CSV</p>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {fileName && <p className="text-xs text-brand-gray mt-2">Loaded: {fileName}</p>}
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      {rows.length > 0 && (
        <div className="card p-5">
          <p className="text-sm font-medium mb-3">3. Preview ({rows.length} places)</p>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-brand-gray border-b border-brand-bg">
                  <th className="p-2">Name</th>
                  <th className="p-2">Location</th>
                  <th className="p-2">Category</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-brand-bg">
                    <td className="p-2">{r.name}</td>
                    <td className="p-2">{r.location}</td>
                    <td className="p-2">{r.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={handleImport}
            disabled={submitting}
            className="btn-primary px-4 py-2 text-sm mt-4"
          >
            {submitting ? "Importing..." : `Import ${rows.length} places`}
          </button>
        </div>
      )}

      {result && (
        <div className="card p-5">
          <p className="text-sm">
            Done — {result.success} added{result.failed > 0 ? `, ${result.failed} failed` : ""}.
          </p>
        </div>
      )}
    </div>
  );
}
