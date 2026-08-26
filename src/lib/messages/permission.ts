export function isMessageable(
  profileId: string | null | undefined,
  allowed: Set<string>,
): profileId is string {
  return Boolean(profileId && allowed.has(profileId));
}
