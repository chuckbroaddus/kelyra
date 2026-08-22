export function firstName(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean)[0] ?? name;
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Relative if under a day, otherwise the same date/time as `formatWhen`. */
export function formatMessageWhen(iso: string, now = Date.now()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const delta = now - date.getTime();
  if (delta < 0 || delta >= 24 * 60 * 60 * 1000) return formatWhen(iso);
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes === 1) return '1 min ago';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours === 1 ? '1 hr ago' : `${hours} hr ago`;
}

/** iMessage-style list time: 3:41 PM, Yesterday, Mon, or 8/12/26. */
export function formatThreadWhen(iso: string, now = Date.now()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (date.getTime() >= start.getTime()) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  const yesterday = new Date(start);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.getTime() >= yesterday.getTime()) return 'Yesterday';
  const week = new Date(start);
  week.setDate(week.getDate() - 6);
  if (date.getTime() >= week.getTime()) {
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  }
  return date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: '2-digit' });
}

export function formatCount(n: number): string {
  if (n <= 0) return '';
  return n > 99 ? '99+' : String(n);
}
