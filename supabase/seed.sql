-- ==========================================================
-- Sample seed data for places
-- Note: log in as the admin account (waller9929@gmail.com) at
-- least once before running this script, so the admin row
-- already exists in public.profiles.
-- ==========================================================

insert into public.places
  (name, location, category, rating, value_rating, price_range,
   time_tags, companion_tags, comment, created_by)
select
  v.name, v.location, v.category, v.rating, v.value_rating, v.price_range,
  v.time_tags, v.companion_tags, v.comment,
  (select id from public.profiles where email = 'waller9929@gmail.com')
from (
  values
    ('Annyeong Sundaeguk', 'Gangnam Station Exit 3', 'Korean', 4.5, 4.7, 'Under $10',
      array['Lunch'], array['Solo','With friends/colleagues'],
      'Great for a quick lunch. Rich broth and a generous portion.'),
    ('Momos Coffee', 'Yeoksam-dong', 'Cafe/Dessert', 4.8, 3.9, '$10-20',
      array['Dinner','Weekend'], array['Solo','With friends/colleagues'],
      'Great coffee and plenty of seating, good for casual meetings too.'),
    ('Sushi Gen', 'Samseong-dong', 'Japanese', 4.2, 3.5, '$20-30',
      array['Dinner'], array['With friends/colleagues'],
      'Not omakase, but a casual sushi spot with solid quality.'),
    ('Pasta Loca', 'Nonhyeon-dong', 'Western', 4.0, 4.2, '$10-20',
      array['Dinner','Weekend'], array['With family','With friends/colleagues'],
      'Generous portions for the price, wide variety of pasta.')
) as v(name, location, category, rating, value_rating, price_range, time_tags, companion_tags, comment)
where exists (select 1 from public.profiles where email = 'waller9929@gmail.com');
