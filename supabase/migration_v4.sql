-- ==========================================================
-- Migration v4 — run this in the Supabase SQL Editor on your
-- EXISTING project (after schema.sql, migration_v2.sql and
-- migration_v3.sql).
--
-- This applies:
-- 1. Removes the "value for money" rating — MAKA now only uses
--    restaurant_type (Value/Standard/Premium) for this.
--
-- Notes on other features requested in this round:
-- - The Indonesia/Other region + city filter is computed from the
--   existing "location" text at read time (see lib/region.ts in the
--   app code) — no database change is needed for it.
-- - The Top 10 ranking and admin "delete all" features use the
--   existing places table and RLS policies — no schema change needed.
-- ==========================================================

alter table public.places drop column if exists value_rating;
