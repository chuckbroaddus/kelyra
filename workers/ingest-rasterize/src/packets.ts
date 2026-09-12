/**
 * fixed_n packet guess (architecture §3.4).
 * Drop blank pages from the stream when ignoreBlankBacks; chunk remaining into N.
 */

export type PageForPacket = {
  id: string;
  pageIndex: number;
  blank: boolean;
};

export type PacketGuess = {
  ordinal: number;
  pageIds: string[];
  blank: boolean;
};

export function buildPacketGuess(
  pages: PageForPacket[],
  pagesPerStudent: number,
  ignoreBlankBacks: boolean,
): PacketGuess[] {
  const n = Math.max(1, Math.min(20, pagesPerStudent | 0));
  const ordered = [...pages].sort((a, b) => a.pageIndex - b.pageIndex);

  const stream = ignoreBlankBacks
    ? ordered.filter((p) => !p.blank)
    : ordered;

  if (stream.length === 0) {
    // All blank: one blank packet so Split Review can show the hole (Confirm stays disabled at 0 non-blank).
    if (ordered.length === 0) return [];
    return [
      {
        ordinal: 1,
        pageIds: ordered.map((p) => p.id),
        blank: true,
      },
    ];
  }

  const packets: PacketGuess[] = [];
  for (let i = 0; i < stream.length; i += n) {
    const chunk = stream.slice(i, i + n);
    packets.push({
      ordinal: packets.length + 1,
      pageIds: chunk.map((p) => p.id),
      blank: chunk.every((p) => p.blank),
    });
  }
  return packets;
}
