-- ==========================================================
-- Migration v6 — run this in the Supabase SQL Editor on your
-- EXISTING project (after schema.sql and migration_v2/v3/v4/v5.sql).
--
-- This applies:
-- 1. Category list expanded/renamed:
--    Korean, Chinese, Japanese, Western, Cafe/Dessert, Other
--    -> Western, Cafe, Korean, Indonesian, Japanese, Seafood,
--       Chinese, Buffet, Other, Dessert
--    Existing rows using the old combined "Cafe/Dessert" value are
--    moved to "Cafe" (edit individually afterward if a place should
--    actually be "Dessert"). All other existing category values
--    (Korean/Chinese/Japanese/Western/Other) are unchanged.
-- ==========================================================

update public.places set category = 'Cafe' where category = 'Cafe/Dessert';
