import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// How many of a feed's most recent items to look at on each run. Duplicate
// articles (matched by link) are skipped by insert_news_article(), so this
// just bounds the work done per feed per run.
const ITEMS_PER_FEED = 5;

function decodeEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

function stripHtml(text: string): string {
  return decodeEntities(text).replace(/<[^>]+>/g, "").trim();
}

function extractTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? match[1] : null;
}

type FeedItem = { title: string; link: string; summary: string };

// Minimal regex-based RSS 2.0 / Atom parser — no XML library dependency.
// Feed structures are simple and predictable enough that this is reliable
// for the handful of well-formed feeds this admin panel is meant for.
function parseFeed(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];

  for (const block of blocks) {
    const rawTitle = extractTag(block, "title");
    if (!rawTitle) continue;

    let link = extractTag(block, "link");
    if (!link) {
      // Atom feeds use <link href="..." /> instead of a text link.
      const hrefMatch = block.match(/<link[^>]*href=["']([^"']+)["']/i);
      link = hrefMatch ? hrefMatch[1] : null;
    }
    if (!link) continue;

    const rawSummary = extractTag(block, "description") ?? extractTag(block, "summary") ?? "";

    items.push({
      title: decodeEntities(rawTitle),
      link: link.trim(),
      summary: stripHtml(rawSummary).slice(0, 300),
    });
    if (items.length >= ITEMS_PER_FEED) break;
  }

  return items;
}

async function isAuthorized(request: Request, supabase: ReturnType<typeof createClient>) {
  // Vercel automatically sends "Authorization: Bearer <CRON_SECRET>" when it
  // invokes a scheduled cron job, once CRON_SECRET is set as an env var.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;

  // Otherwise fall back to "is a logged-in admin" for the manual
  // "Fetch now" button in Admin > Board.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  return !!profile?.is_admin;
}

export async function POST(request: Request) {
  const supabase = createClient();

  if (!(await isAuthorized(request, supabase))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const { data: feeds } = await supabase.from("rss_feeds").select("id, name, feed_url");
  if (!feeds || feeds.length === 0) {
    return NextResponse.json({ inserted: 0, message: "No RSS feeds registered." });
  }

  let inserted = 0;
  const errors: string[] = [];

  for (const feed of feeds) {
    try {
      const res = await fetch(feed.feed_url, { headers: { "User-Agent": "MakaBot/1.0" } });
      if (!res.ok) {
        errors.push(`${feed.name}: HTTP ${res.status}`);
        continue;
      }
      const xml = await res.text();
      const items = parseFeed(xml);

      for (const item of items) {
        const { data: newId, error } = await supabase.rpc("insert_news_article", {
          p_title: item.title,
          p_content: item.summary || item.title,
          p_source_name: feed.name,
          p_source_url: item.link,
        });
        if (error) {
          errors.push(`${feed.name}: ${error.message}`);
        } else if (newId) {
          inserted++;
        }
      }
    } catch (err: any) {
      errors.push(`${feed.name}: ${err.message ?? "fetch failed"}`);
    }
  }

  return NextResponse.json({ inserted, errors: errors.length > 0 ? errors : undefined });
}

// Vercel Cron sends a GET request to the scheduled path.
export async function GET(request: Request) {
  return POST(request);
}
