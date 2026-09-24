/**
 * SR-A Split Review — web/tablet primary filmstrip.
 * Confirm → confirm_ingest_batch (unnamed captures). Never Approve / never invent students.
 * Phone: gate copy only (no primary filmstrip).
 */

import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { GhostButton, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { FormSheet } from '@/components/ui/FormSheet';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { type } from '@/constants/theme';
import {
  abandonIngestBatch,
  confirmIngestBatch,
  fetchIngestSplitReview,
  retryIngestRemainder,
  saveIngestSplit,
  type IngestPageRow,
  IngestRpcError,
} from '@/lib/ingest/api';
import { INGEST_COPY, ingestGapCopy } from '@/lib/ingest/copy';
import { nextPersistChainOk } from '@/lib/ingest/saveQueue';
import {
  canConfirmSplit,
  eligiblePacketCount,
  mergeWithPrevious,
  movePacket,
  rosterCheckOff,
  splitAtFocus,
  togglePacketBlank,
  type SplitFocus,
  type SplitPacketDraft,
} from '@/lib/ingest/splitPackets';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  visible: boolean;
  batchId: string;
  onClose: () => void;
  /** After Confirm → Inbox; parent should reset binder. */
  onConfirmed?: () => void;
  /**
   * I5: after retry_ingest_remainder, parent must keep batchId and poll
   * (waiting → split_review). Do not reset/close the binder session.
   */
  onRetryRemainder?: () => void | Promise<void>;
};

/** Always RFC4122 UUID — ingest_packets.id is uuid (no pkt- timestamp fallback). */
function newPacketId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  // RFC4122 v4 polyfill when randomUUID missing (non-secure contexts).
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) bytes[i] = (Math.random() * 256) | 0;
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function SplitReview({
  visible,
  batchId,
  onClose,
  onConfirmed,
  onRetryRemainder,
}: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  const phoneGate = Platform.OS !== 'web';

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [versionConflict, setVersionConflict] = useState(false);
  const [version, setVersion] = useState(1);
  const [pages, setPages] = useState<IngestPageRow[]>([]);
  const [packets, setPackets] = useState<SplitPacketDraft[]>([]);
  const [rosterCount, setRosterCount] = useState(0);
  const [pagesPerStudent, setPagesPerStudent] = useState(1);
  const [focus, setFocus] = useState<SplitFocus>({ packetIndex: 0, pageIndex: 0 });
  /** I5: confirm left some packets unminted, or binder handed a partial batch. */
  const [partialBanner, setPartialBanner] = useState<string | null>(null);
  const [retryBusy, setRetryBusy] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const versionRef = useRef(1);
  const packetsRef = useRef<SplitPacketDraft[]>([]);
  /** Latest packets waiting for the serial save chain (coalesce debounce + Confirm). */
  const pendingSaveRef = useRef<SplitPacketDraft[] | null>(null);
  const saveChainRef = useRef<Promise<boolean>>(Promise.resolve(true));

  versionRef.current = version;
  packetsRef.current = packets;

  const pageById = useMemo(() => {
    const map = new Map<string, IngestPageRow>();
    for (const p of pages) map.set(p.id, p);
    return map;
  }, [pages]);

  const eligible = eligiblePacketCount(packets);
  const confirmEnabled = canConfirmSplit({ packets, busy, versionConflict });
  const checkOff = rosterCheckOff({
    eligiblePackets: eligible,
    rosterCount,
    pagesPerStudent,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setVersionConflict(false);
    setPartialBanner(null);
    try {
      const payload = await fetchIngestSplitReview(batchId);
      setPages(payload.pages);
      setPackets(
        payload.packets.map((p) => ({
          id: p.id,
          ordinal: p.ordinal,
          page_ids: p.page_ids ?? [],
          blank: p.blank,
        })),
      );
      setVersion(payload.batch.split_draft_version ?? 1);
      setRosterCount(payload.rosterCount);
      setPagesPerStudent(payload.batch.pages_per_student ?? 1);
      setFocus({ packetIndex: 0, pageIndex: 0 });
      if (payload.batch.status === 'partial') {
        const gap = ingestGapCopy(payload.batch.error_code, payload.batch.error_message);
        setPartialBanner(
          INGEST_COPY.partialBanner(
            gap,
            payload.batch.pages_done ?? 0,
            payload.batch.page_count,
          ),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load split review.');
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    if (visible && batchId) void load();
  }, [visible, batchId, load]);

  const persistDraft = useCallback(
    async (nextPackets: SplitPacketDraft[]): Promise<boolean> => {
      try {
        // Version resolved inside per-batch save queue so Confirm after debounce sees the bump.
        const updated = await saveIngestSplit(batchId, nextPackets, () => versionRef.current);
        const nextVersion = updated.split_draft_version ?? versionRef.current + 1;
        setVersion(nextVersion);
        versionRef.current = nextVersion;
          setVersionConflict(false);
        return true;
      } catch (err) {
        if (err instanceof IngestRpcError && err.code === 'confirm_conflict') {
          setVersionConflict(true);
          setError(err.message);
          return false;
        }
        setError(err instanceof Error ? err.message : 'Could not save split.');
        return false;
      }
    },
    [batchId],
  );

  /** Coalesce overlapping debounce/Confirm into one serial chain (latest packets win). */
  const enqueuePersist = useCallback(
    (nextPackets: SplitPacketDraft[]): Promise<boolean> => {
      pendingSaveRef.current = nextPackets;
      saveChainRef.current = saveChainRef.current
        .catch(() => false)
        .then(async (priorOk) => {
          const toSave = pendingSaveRef.current;
          if (!toSave) return nextPersistChainOk(priorOk !== false, false);
          pendingSaveRef.current = null;
          const persistOk = await persistDraft(toSave);
          return nextPersistChainOk(priorOk !== false, true, persistOk);
        });
      return saveChainRef.current;
    },
    [persistDraft],
  );

  const scheduleSave = useCallback(
    (nextPackets: SplitPacketDraft[]) => {
      pendingSaveRef.current = nextPackets;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveTimer.current = null;
        void enqueuePersist(nextPackets);
      }, 450);
    },
    [enqueuePersist],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const applyPackets = useCallback(
    (next: SplitPacketDraft[], nextFocus?: SplitFocus) => {
      setPackets(next);
      if (nextFocus) setFocus(nextFocus);
      scheduleSave(next);
    },
    [scheduleSave],
  );

  const doSplit = useCallback(() => {
    const next = splitAtFocus(packetsRef.current, focus, newPacketId());
    if (next === packetsRef.current) return;
    applyPackets(next, { packetIndex: focus.packetIndex + 1, pageIndex: 0 });
  }, [applyPackets, focus]);

  const doMerge = useCallback(() => {
    if (focus.packetIndex <= 0) return;
    const next = mergeWithPrevious(packetsRef.current, focus.packetIndex);
    applyPackets(next, {
      packetIndex: focus.packetIndex - 1,
      pageIndex: 0,
    });
  }, [applyPackets, focus.packetIndex]);

  const doBlank = useCallback(() => {
    const next = togglePacketBlank(packetsRef.current, focus.packetIndex);
    applyPackets(next);
  }, [applyPackets, focus.packetIndex]);

  const doMove = useCallback(
    (dir: -1 | 1) => {
      const next = movePacket(packetsRef.current, focus.packetIndex, dir);
      const target = focus.packetIndex + dir;
      if (target < 0 || target >= packetsRef.current.length) return;
      applyPackets(next, { packetIndex: target, pageIndex: 0 });
    },
    [applyPackets, focus.packetIndex],
  );

  useEffect(() => {
    if (!visible || phoneGate || loading || busy) return;
    if (typeof window === 'undefined') return;
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      const key = event.key.toLowerCase();
      if (key === 's') {
        event.preventDefault();
        doSplit();
      } else if (key === 'm') {
        event.preventDefault();
        doMerge();
      } else if (key === 'b') {
        event.preventDefault();
        doBlank();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, phoneGate, loading, busy, doSplit, doMerge, doBlank]);

  const handleConfirm = async () => {
    if (!confirmEnabled) return;
    setBusy(true);
    setError(null);
    setPartialBanner(null);
    try {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      // Authoritative persist of on-screen packets; coalesced chain must not
      // upgrade a prior failed save into success (nextPersistChainOk).
      const saved = await enqueuePersist(packetsRef.current);
      if (!saved) return;
      const batch = await confirmIngestBatch(batchId, versionRef.current);
      if (batch.status === 'partial') {
        const gap = ingestGapCopy(batch.error_code, batch.error_message);
        const done = batch.pages_done ?? 0;
        setPartialBanner(INGEST_COPY.partialBanner(gap, done, batch.page_count));
        // Minted packets already in Inbox; remainder stays recoverable here.
        return;
      }
      onConfirmed?.();
      onClose();
      router.push('/inbox');
    } catch (err) {
      if (err instanceof IngestRpcError && err.code === 'confirm_conflict') {
        setVersionConflict(true);
      }
      setError(err instanceof Error ? err.message : 'Confirm failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleRetryRemainder = async () => {
    if (retryBusy) return;
    setRetryBusy(true);
    setError(null);
    try {
      await retryIngestRemainder(batchId);
      setPartialBanner(null);
      // Keep binder session: parent flips to waiting + polls until split_review.
      if (onRetryRemainder) {
        await onRetryRemainder();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : INGEST_COPY.retryRemainderFailed);
    } finally {
      setRetryBusy(false);
    }
  };

  const handleAbandon = async () => {
    setBusy(true);
    setError(null);
    try {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      await abandonIngestBatch(batchId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel stack.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormSheet visible={visible} title={INGEST_COPY.splitTitle} onClose={() => !busy && onClose()}>
      {phoneGate ? (
        <View style={styles.gaps}>
          <Text style={[type.body, { color: colors.ink }]}>{INGEST_COPY.splitPhoneWaiting}</Text>
          <Text style={[type.meta, { color: colors.mute }]}>{INGEST_COPY.phoneGate}</Text>
          <GhostButton label="Close" onPress={onClose} />
        </View>
      ) : null}

      {!phoneGate ? (
        <View style={styles.gaps}>
          <Text style={[type.meta, { color: colors.mute }]}>{INGEST_COPY.splitLead}</Text>
          <Text
            style={[
              type.meta,
              { color: checkOff.match ? colors.mute : colors.warn },
            ]}
            accessibilityLiveRegion="polite"
          >
            {checkOff.label}
            {!checkOff.match && checkOff.expected > 0 ? ` · ${INGEST_COPY.splitRosterMismatch}` : ''}
          </Text>
          <Text style={[type.meta, { color: colors.mute }]}>{INGEST_COPY.splitKeys}</Text>

          {partialBanner ? (
            <View style={styles.gaps}>
              <Text
                style={[type.body, { color: colors.danger }]}
                accessibilityLiveRegion="polite"
              >
                {partialBanner}
              </Text>
              <PrimaryButton
                label={retryBusy ? INGEST_COPY.retryRemainderBusy : INGEST_COPY.retryRemainder}
                disabled={retryBusy || busy}
                onPress={() => void handleRetryRemainder()}
              />
            </View>
          ) : null}

          {loading ? (
            <Text style={[type.body, { color: colors.mute }]}>Loading pages…</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator style={styles.filmstrip}>
              {packets.map((pkt, packetIndex) => (
                <View
                  key={pkt.id}
                  style={[
                    styles.packet,
                    {
                      borderColor:
                        focus.packetIndex === packetIndex ? colors.brand : colors.line,
                      backgroundColor: pkt.blank ? colors.wash : colors.bg,
                      opacity: pkt.blank ? 0.55 : 1,
                    },
                  ]}
                >
                  <Text style={[type.meta, { color: colors.mute }]}>
                    #{pkt.ordinal}
                    {pkt.blank ? ` · ${INGEST_COPY.splitBlank}` : ''}
                  </Text>
                  <View style={styles.packetPages}>
                    {pkt.page_ids.map((pageId, pageIndex) => {
                      const page = pageById.get(pageId);
                      const selected =
                        focus.packetIndex === packetIndex && focus.pageIndex === pageIndex;
                      return (
                        <Pressable
                          key={pageId}
                          accessibilityRole="button"
                          accessibilityLabel={`Packet ${pkt.ordinal} page ${pageIndex + 1}`}
                          onPress={() => setFocus({ packetIndex, pageIndex })}
                          style={[
                            styles.thumbWrap,
                            {
                              borderColor: selected ? colors.brand : colors.line,
                            },
                          ]}
                        >
                          {page?.thumbUrl ? (
                            <RemoteImage
                              uri={page.thumbUrl}
                              style={styles.thumb}
                              contentFit="cover"
                              accessibilityLabel={`Page ${page.page_index + 1}`}
                            />
                          ) : (
                            <View style={[styles.thumb, { backgroundColor: colors.wash }]}>
                              <Text style={[type.meta, { color: colors.mute }]}>
                                {page ? page.page_index + 1 : '?'}
                              </Text>
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.row}>
            <SecondaryButton
              align="left"
              label={INGEST_COPY.splitSplit}
              disabled={busy || loading}
              onPress={doSplit}
            />
            <SecondaryButton
              align="left"
              label={INGEST_COPY.splitMerge}
              disabled={busy || loading || focus.packetIndex <= 0}
              onPress={doMerge}
            />
            <SecondaryButton
              align="left"
              label={INGEST_COPY.splitBlank}
              disabled={busy || loading}
              onPress={doBlank}
            />
          </View>
          <View style={styles.row}>
            <GhostButton
              align="left"
              label={INGEST_COPY.splitMoveUp}
              disabled={busy || loading || focus.packetIndex <= 0}
              onPress={() => doMove(-1)}
            />
            <GhostButton
              align="left"
              label={INGEST_COPY.splitMoveDown}
              disabled={busy || loading || focus.packetIndex >= packets.length - 1}
              onPress={() => doMove(1)}
            />
          </View>

          {versionConflict ? (
            <SecondaryButton label="Reload split" disabled={busy} onPress={() => void load()} />
          ) : null}

          {error ? <Text style={[type.body, { color: colors.danger }]}>{error}</Text> : null}
          {!confirmEnabled && !busy && !loading ? (
            <Text style={[type.meta, { color: colors.mute }]}>{INGEST_COPY.splitEmptyConfirm}</Text>
          ) : null}

          <PrimaryButton
            label={busy ? INGEST_COPY.splitConfirming : INGEST_COPY.splitConfirm}
            disabled={!confirmEnabled}
            onPress={() => void handleConfirm()}
          />
          <GhostButton
            label={INGEST_COPY.splitCancel}
            disabled={busy}
            onPress={() => void handleAbandon()}
          />
        </View>
      ) : null}
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  gaps: { gap: 12 },
  filmstrip: { maxHeight: 168 },
  packet: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 8,
    marginRight: 10,
    gap: 6,
    minWidth: 96,
  },
  packetPages: { flexDirection: 'row', gap: 6 },
  thumbWrap: {
    borderWidth: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumb: {
    width: 72,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
