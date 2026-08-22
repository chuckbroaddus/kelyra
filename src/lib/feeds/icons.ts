/** Stroke glyphs a feed owner may pin on their school or class feed. */
export const FEED_ICON_NAMES = [
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
  'feedSun',
] as const;

export type FeedIconName = (typeof FEED_ICON_NAMES)[number];

export const DEFAULT_SCHOOL_FEED_ICON: FeedIconName = 'feedSchool';
export const DEFAULT_CLASS_FEED_ICON: FeedIconName = 'feedClass';

export type FeedIconMeta = {
  name: FeedIconName;
  label: string;
  hint: string;
  symbol: string;
};

export const FEED_ICON_CATALOG: FeedIconMeta[] = [
  { name: 'feedSchool', label: 'School', hint: 'Campus and school-wide updates', symbol: 'building.columns' },
  { name: 'feedClass', label: 'Classroom', hint: 'Homeroom or a general class', symbol: 'chalkboard' },
  { name: 'feedBook', label: 'Reading', hint: 'Reading, literature, library', symbol: 'book' },
  { name: 'feedEnglish', label: 'English', hint: 'English language arts', symbol: 'textformat' },
  { name: 'feedLanguage', label: 'Language', hint: 'World language, ELL', symbol: 'character.book.closed' },
  { name: 'feedPencil', label: 'Writing', hint: 'Composition and journals', symbol: 'pencil' },
  { name: 'feedMath', label: 'Math', hint: 'Math and numbers', symbol: 'pi' },
  { name: 'feedGeom', label: 'Geometry', hint: 'Geometry and measurement', symbol: 'triangle' },
  { name: 'feedStat', label: 'Statistics', hint: 'Stats, data, probability', symbol: 'chart.bar' },
  { name: 'feedScience', label: 'Science', hint: 'General science', symbol: 'flask' },
  { name: 'feedChem', label: 'Chemistry', hint: 'Chemistry', symbol: 'atom' },
  { name: 'feedPhysics', label: 'Physics', hint: 'Physics', symbol: 'atom' },
  { name: 'feedBio', label: 'Biology', hint: 'Biology and life science', symbol: 'leaf' },
  { name: 'feedLab', label: 'Lab', hint: 'Lab, STEM bench, maker', symbol: 'testtube.2' },
  { name: 'feedGlobe', label: 'Geography', hint: 'Geography and cultures', symbol: 'globe' },
  { name: 'feedWorldHistory', label: 'World history', hint: 'World history', symbol: 'globe.desk' },
  { name: 'feedUSHistory', label: 'U.S. history', hint: 'United States history', symbol: 'flag' },
  { name: 'feedStateHistory', label: 'State history', hint: 'State or local history', symbol: 'building.columns' },
  { name: 'feedMap', label: 'History', hint: 'History survey', symbol: 'map' },
  { name: 'feedGov', label: 'Government', hint: 'Civics and government', symbol: 'building.columns' },
  { name: 'feedEcon', label: 'Economics', hint: 'Economics', symbol: 'chart.line.uptrend.xyaxis' },
  { name: 'feedBible', label: 'Bible', hint: 'Christian Bible class', symbol: 'cross' },
  { name: 'feedArt', label: 'Art', hint: 'Studio and visual art', symbol: 'paintpalette' },
  { name: 'feedMusic', label: 'Music', hint: 'Band, choir, orchestra', symbol: 'music.note' },
  { name: 'feedTheater', label: 'Drama', hint: 'Theater and performance', symbol: 'theatermasks' },
  { name: 'feedSport', label: 'PE', hint: 'Physical education and athletics', symbol: 'figure.run' },
  { name: 'feedCode', label: 'Computers', hint: 'Coding and media', symbol: 'chevron.left.forwardslash.chevron.right' },
  { name: 'feedRobot', label: 'Robotics', hint: 'Robotics and engineering', symbol: 'cpu' },
  { name: 'feedShop', label: 'Shop', hint: 'CTE, shop, industrial arts', symbol: 'wrench.and.screwdriver' },
  { name: 'feedAg', label: 'Agriculture', hint: 'Ag, horticulture, FFA', symbol: 'leaf' },
  { name: 'feedHealth', label: 'Health', hint: 'Health and nutrition', symbol: 'cross.case' },
  { name: 'feedNews', label: 'Journalism', hint: 'Newspaper, yearbook, media', symbol: 'newspaper' },
  { name: 'feedLibrary', label: 'Library', hint: 'Library and media center', symbol: 'books.vertical' },
  { name: 'feedHeart', label: 'Wellness', hint: 'Counseling, health, support', symbol: 'heart' },
  { name: 'feedStar', label: 'Honors', hint: 'Gifted, honors, leadership', symbol: 'star' },
  { name: 'feedSun', label: 'Early years', hint: 'Pre-K, kindergarten, primary', symbol: 'sun.max' },
];

const FEED_SET = new Set<string>(FEED_ICON_NAMES);

export function isFeedIconName(value: string | null | undefined): value is FeedIconName {
  return Boolean(value && FEED_SET.has(value));
}

export function asFeedIcon(value: string | null | undefined, fallback: FeedIconName): FeedIconName {
  return isFeedIconName(value) ? value : fallback;
}

export function feedIconLabel(value: string | null | undefined): string {
  const name = isFeedIconName(value) ? value : null;
  return FEED_ICON_CATALOG.find((item) => item.name === name)?.label ?? 'Classroom';
}

export function asIconName(value: FeedIconName): FeedIconName {
  return value;
}
