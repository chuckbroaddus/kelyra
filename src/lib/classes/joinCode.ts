const ADJECTIVES = [
  'AMBER',
  'BRAVE',
  'CALM',
  'CLEVER',
  'COZY',
  'FAIR',
  'FRESH',
  'GENTLE',
  'GOLDEN',
  'HAPPY',
  'KIND',
  'LUCKY',
  'MERRY',
  'NOBLE',
  'QUIET',
  'SILVER',
  'SUNNY',
  'SWEET',
  'WARM',
  'WISE',
] as const;

const NOUNS = [
  'ACORN',
  'APPLE',
  'BOOK',
  'CEDAR',
  'CHALK',
  'DAISY',
  'DESK',
  'FERN',
  'HARBOR',
  'LARK',
  'MAPLE',
  'MOSS',
  'OAK',
  'PAPER',
  'PEBBLE',
  'PINE',
  'QUILL',
  'RIVER',
  'ROBIN',
  'WILLOW',
] as const;

const WORD_CODE = /^[A-Z]+-[A-Z]+$/;

function pick<T extends readonly string[]>(list: T): T[number] {
  return list[Math.floor(Math.random() * list.length)]!;
}

export function generateJoinCode(): string {
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}`;
}

export function isFriendlyJoinCode(code: string): boolean {
  return WORD_CODE.test(code.trim().toUpperCase());
}

export function normalizeJoinCode(input: string): string {
  const trimmed = input.trim().toUpperCase();
  if (/^[A-Z]+[\s-]+[A-Z]+$/.test(trimmed)) {
    return trimmed.replace(/\s+/g, '-').replace(/-+/g, '-');
  }
  return trimmed.replace(/[\s_-]+/g, '');
}

function titleCase(word: string): string {
  return word.charAt(0) + word.slice(1).toLowerCase();
}

export function formatJoinCode(code: string): string {
  const normalized = normalizeJoinCode(code);
  if (isFriendlyJoinCode(normalized)) {
    return normalized.split('-').map(titleCase).join(' ');
  }
  const compact = normalized.replace(/[^A-Z0-9]/g, '');
  if (compact.length === 6) return `${compact.slice(0, 3)} ${compact.slice(3)}`;
  if (compact.length > 4) return `${compact.slice(0, 4)} ${compact.slice(4)}`;
  return compact || code;
}
