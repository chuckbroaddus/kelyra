-- Add Bible class glyph. Recreate the allow-list (paste in the SQL editor).

create or replace function public.feed_icon_ok(p_icon text)
returns boolean
language sql
immutable
as $$
  select p_icon in (
    'feedSchool',
    'feedClass',
    'feedBook',
    'feedMath',
    'feedBible',
    'feedScience',
    'feedArt',
    'feedMusic',
    'feedSport',
    'feedGlobe',
    'feedCode',
    'feedTheater',
    'feedHeart',
    'feedStar',
    'feedSun',
    'feedPencil',
    'feedMap',
    'feedLab'
  );
$$;
