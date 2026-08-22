-- Expand the feed-icon allow-list (paste in the SQL editor).

create or replace function public.feed_icon_ok(p_icon text)
returns boolean
language sql
immutable
as $$
  select p_icon in (
    'feedSchool',
    'feedClass',
    'feedBook',
    'feedEnglish',
    'feedLanguage',
    'feedPencil',
    'feedMath',
    'feedGeom',
    'feedStat',
    'feedScience',
    'feedChem',
    'feedPhysics',
    'feedBio',
    'feedLab',
    'feedGlobe',
    'feedWorldHistory',
    'feedUSHistory',
    'feedStateHistory',
    'feedMap',
    'feedGov',
    'feedEcon',
    'feedBible',
    'feedArt',
    'feedMusic',
    'feedTheater',
    'feedSport',
    'feedCode',
    'feedRobot',
    'feedShop',
    'feedAg',
    'feedHealth',
    'feedNews',
    'feedLibrary',
    'feedHeart',
    'feedStar',
    'feedSun'
  );
$$;
