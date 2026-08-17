import AsyncStorage from '@react-native-async-storage/async-storage';

export type StoredParentChild = {
  token: string;
  displayName: string;
  className: string;
  fingerprint: string;
};

const TOKENS_KEY = 'kelyra.parent.tokens';
const LAST_SEEN_KEY = 'kelyra.parent.lastSeenAt';

export function parentFingerprint(input: {
  sentence: string | null;
  practiceStatus: string | null;
  focusLabel: string | null;
}): string {
  return [input.sentence ?? '', input.practiceStatus ?? '', input.focusLabel ?? ''].join('|');
}

export async function listParentTokens(): Promise<StoredParentChild[]> {
  const raw = await AsyncStorage.getItem(TOKENS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StoredParentChild[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function rememberParentToken(child: StoredParentChild) {
  const current = await listParentTokens();
  const next = [child, ...current.filter((item) => item.token !== child.token)];
  await AsyncStorage.setItem(TOKENS_KEY, JSON.stringify(next));
}

export async function touchParentLastSeen() {
  await AsyncStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
}

export async function getParentLastSeen(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_SEEN_KEY);
}

export async function parentBellCount(children: StoredParentChild[]): Promise<number> {
  if (!children.length) return 0;
  const lastSeen = await getParentLastSeen();
  const hasNews = children.some((child) => {
    const [sentence, practice, focus] = child.fingerprint.split('|');
    return Boolean(sentence || practice || focus);
  });
  if (!hasNews) return 0;
  if (!lastSeen) return 1;
  return 0;
}
