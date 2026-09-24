/**
 * CE-A binder: bind exactly one class + pages-per-student N, then upload.
 * After rasterize → always enter Split Review (I3). Teach seat / web primary.
 * Phone shows gate copy (BATCH-16); not primary splitter.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { SplitReview } from '@/components/ingest/SplitReview';
import { GhostButton, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { FormSheet } from '@/components/ui/FormSheet';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import {
  abandonIngestBatch,
  fetchIngestBatch,
  fetchOpenIngestBatchForClass,
  IngestRpcError,
  retryIngestRemainder,
  type IngestBatchRow,
} from '@/lib/ingest/api';
import { evaluateFileCaps, formatMb } from '@/lib/ingest/caps';
import { INGEST_COPY, ingestGapCopy } from '@/lib/ingest/copy';
import { gateStackFiles, runClassStackUpload, type StackFile } from '@/lib/ingest/runUpload';
import type { ClassRow } from '@/lib/supabase/types';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { useGlobalProcessingActive } from '@/lib/chrome/globalProcessing';

type Props = {
  visible: boolean;
  onClose: () => void;
  teacherId: string;
  classes: ClassRow[];
  initialClassId: string | null;
  /** chrome.role === 'teacher' */
  teachSeat: boolean;
};

type Picked = StackFile & { key: string };

type Phase = 'bind' | 'waiting' | 'split' | 'partial' | 'failed';

const POLL_MS = 1500;

export function ClassStackBinder({
  visible,
  onClose,
  teacherId,
  classes,
  initialClassId,
  teachSeat,
}: Props) {
  const { colors } = useTheme();
  const [classId, setClassId] = useState<string | null>(initialClassId);
  const [pagesPerStudent, setPagesPerStudent] = useState('1');
  const [picked, setPicked] = useState<Picked[]>([]);
  const [softWarn, setSoftWarn] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [progressPct, setProgressPct] = useState<number | null>(null);
  const [method, setMethod] = useState<'tus' | 'standard' | null>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<Phase>('bind');
  const [batchId, setBatchId] = useState<string | null>(null);
  const [pagesDone, setPagesDone] = useState(0);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [gapMessage, setGapMessage] = useState<string | null>(null);
  const [retryBusy, setRetryBusy] = useState(false);
  const [abandonBusy, setAbandonBusy] = useState(false);
  /** False after confirm-partial (minted captures) — abandon RPC refuses. */
  const [canAbandonPartial, setCanAbandonPartial] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeAttemptedRef = useRef(false);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setClassId(initialClassId);
      setError(null);
      setStatus(null);
      setProgressPct(null);
      setMethod(null);
      resumeAttemptedRef.current = false;
    }
  }, [visible, initialClassId]);

  const className = useMemo(
    () => classes.find((c) => c.id === classId)?.name ?? null,
    [classes, classId],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    stopPoll();
    setPicked([]);
    setSoftWarn(null);
    setError(null);
    setStatus(null);
    setProgressPct(null);
    setMethod(null);
    setBusy(false);
    setPagesPerStudent('1');
    setClassId(initialClassId);
    setPhase('bind');
    setBatchId(null);
    setPagesDone(0);
    setPageCount(null);
    setGapMessage(null);
    setRetryBusy(false);
    setAbandonBusy(false);
    setCanAbandonPartial(true);
  }, [initialClassId, stopPoll]);

  const handleClose = () => {
    if (busy || retryBusy || abandonBusy) return;
    if (phase === 'split') return;
    // Close does not abandon — resume-on-open restores partial/retry/split_review.
    reset();
    onClose();
  };

  const applyBatchProgress = useCallback(
    (batch: IngestBatchRow) => {
      setPagesDone(batch.pages_done ?? 0);
      setPageCount(batch.page_count);
      setCanAbandonPartial(!batch.teacher_confirmed_split);
      if (batch.status === 'split_review') {
        stopPoll();
        setPhase('split');
        setStatus(null);
        setGapMessage(null);
        setError(null);
        return;
      }
      if (batch.status === 'partial') {
        stopPoll();
        setPhase('partial');
        const gap = ingestGapCopy(batch.error_code, batch.error_message);
        const done = batch.pages_done ?? 0;
        const total = batch.page_count;
        setGapMessage(gap);
        setError(INGEST_COPY.partialBanner(gap, done, total));
        setStatus(
          total != null && total > 0 ? INGEST_COPY.progressPages(done, total) : null,
        );
        return;
      }
      if (batch.status === 'failed' || batch.status === 'abandoned') {
        stopPoll();
        setPhase('failed');
        setGapMessage(null);
        setError(
          batch.error_code === 'encrypted_pdf'
            ? INGEST_COPY.encryptedPdf
            : ingestGapCopy(batch.error_code, batch.error_message),
        );
        return;
      }
      const done = batch.pages_done ?? 0;
      const total = batch.page_count;
      if (total != null && total > 0) {
        setStatus(INGEST_COPY.progressPages(done, total));
      } else {
        setStatus(INGEST_COPY.received);
      }
    },
    [stopPoll],
  );

  const startPolling = useCallback(
    (id: string) => {
      stopPoll();
      setPhase('waiting');
      setBatchId(id);
      const tick = async () => {
        try {
          const batch = await fetchIngestBatch(id);
          applyBatchProgress(batch);
        } catch {
          // Keep waiting; worker may not have claimed yet.
        }
      };
      void tick();
      pollRef.current = setInterval(() => {
        void tick();
      }, POLL_MS);
    },
    [applyBatchProgress, stopPoll],
  );

  useEffect(() => () => stopPoll(), [stopPoll]);

  // I5: resume open partial/retry/split_review so Close cannot strand behind open_sha.
  useEffect(() => {
    if (!visible || !teachSeat || Platform.OS !== 'web') return;
    if (phase !== 'bind' || resumeAttemptedRef.current) return;
    const cid = classId ?? initialClassId;
    if (!cid) return;
    resumeAttemptedRef.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const open = await fetchOpenIngestBatchForClass(cid);
        if (cancelled || !open) return;
        setBatchId(open.id);
        setPagesPerStudent(String(open.pages_per_student ?? 1));
        setStatus(INGEST_COPY.resumeOpenPartial);
        applyBatchProgress(open);
        if (
          open.status === 'received' ||
          open.status === 'receiving' ||
          open.status === 'rasterizing' ||
          open.status === 'retry_remainder'
        ) {
          startPolling(open.id);
        }
      } catch {
        // Stay on bind; teacher can still upload a new stack.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    visible,
    teachSeat,
    phase,
    classId,
    initialClassId,
    applyBatchProgress,
    startPolling,
  ]);

  const onRetryRemainder = async () => {
    if (!batchId || retryBusy) return;
    setRetryBusy(true);
    setError(null);
    try {
      const batch = await retryIngestRemainder(batchId);
      setGapMessage(null);
      setStatus(INGEST_COPY.received);
      applyBatchProgress(batch);
      startPolling(batchId);
    } catch (err) {
      setError(err instanceof Error ? err.message : INGEST_COPY.retryRemainderFailed);
    } finally {
      setRetryBusy(false);
    }
  };

  const onAbandonPartial = async () => {
    if (!batchId || abandonBusy || retryBusy) return;
    setAbandonBusy(true);
    setError(null);
    try {
      await abandonIngestBatch(batchId);
      reset();
      onClose();
    } catch (err) {
      if (err instanceof IngestRpcError && err.code === 'cannot_abandon_after_confirm') {
        // t_da864a81: only use post-confirm Inbox copy when UI already knows confirm minted.
        // Pre-confirm partial rejects (e.g. unapplied I5 SQL) must not claim Needs Attention.
        if (canAbandonPartial) {
          setError(INGEST_COPY.abandonPartialFailed);
        } else {
          setError(INGEST_COPY.abandonAfterConfirm);
        }
        setCanAbandonPartial(false);
      } else {
        setError(err instanceof Error ? err.message : INGEST_COPY.abandonPartialFailed);
      }
    } finally {
      setAbandonBusy(false);
    }
  };

  const onPickFiles = (list: FileList | File[] | null | undefined) => {
    if (!list) return;
    const next: Picked[] = [];
    const arr = Array.from(list as ArrayLike<File>);
    let batchBytes = picked.reduce((sum, p) => sum + p.file.size, 0);
    for (const file of arr) {
      const verdict = evaluateFileCaps({
        mimeType: file.type,
        byteSize: file.size,
        batchBytesSoFar: batchBytes,
      });
      if (!verdict.ok) {
        setError(verdict.message);
        return;
      }
      if (verdict.softWarn) {
        setSoftWarn(verdict.softReasons[0] ?? INGEST_COPY.softWarn(formatMb(batchBytes + file.size)));
      }
      next.push({
        key: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
      });
      batchBytes += file.size;
    }
    setError(null);
    setPicked((cur) => [...cur, ...next]);
  };

  const openFilePicker = () => {
    if (typeof document === 'undefined') return;
    const el = document.createElement('input');
    el.type = 'file';
    el.multiple = true;
    el.accept =
      'application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif';
    el.onchange = () => onPickFiles(el.files);
    el.click();
  };

  const startUpload = async () => {
    if (!teachSeat) {
      setError(INGEST_COPY.teachSeatOnly);
      return;
    }
    if (!classId) {
      setError(INGEST_COPY.classRequired);
      return;
    }
    const n = Math.max(1, Math.min(20, parseInt(pagesPerStudent, 10) || 1));
    const gate = gateStackFiles(picked);
    if (!gate.ok) {
      setError(gate.message);
      return;
    }
    if (gate.softWarn) {
      setSoftWarn(gate.softReasons[0] ?? null);
    }

    setBusy(true);
    setError(null);
    setStatus(INGEST_COPY.uploading);
    const ac = new AbortController();
    abortRef.current = ac;

    const result = await runClassStackUpload({
      teacherId,
      classId,
      pagesPerStudent: n,
      files: picked,
      signal: ac.signal,
      onProgress: (p) => {
        setMethod(p.method);
        if (p.bytesTotal > 0) {
          setProgressPct(Math.min(100, Math.round((100 * p.bytesUploaded) / p.bytesTotal)));
          setStatus(
            `${p.fileName || 'File'} · ${INGEST_COPY.progressBytes(p.bytesUploaded, p.bytesTotal)}${
              p.method === 'tus' ? ' · resumable' : ''
            }`,
          );
        } else if (p.phase === 'finishing') {
          setStatus(INGEST_COPY.received);
        }
      },
    });

    setBusy(false);
    abortRef.current = null;

    if (!result.ok) {
      setError(result.message);
      setStatus(null);
      setProgressPct(null);
      return;
    }

    setMethod(result.methods[0] ?? null);
    setProgressPct(100);
    setStatus(INGEST_COPY.received);
    if (result.softWarnings[0]) setSoftWarn(result.softWarnings[0]);
    startPolling(result.batch.id);
  };

  const phoneGate = Platform.OS !== 'web';
  const showBind = !phoneGate && teachSeat && phase === 'bind';
  const showWaiting = !phoneGate && teachSeat && phase === 'waiting';
  useGlobalProcessingActive(Boolean(showWaiting));
  const showPartial = !phoneGate && teachSeat && phase === 'partial';
  const showFailed = !phoneGate && teachSeat && phase === 'failed';

  return (
    <>
      <FormSheet
        visible={visible && phase !== 'split'}
        title={INGEST_COPY.binderTitle}
        onClose={handleClose}
      >
        {!teachSeat ? (
          <Text style={[type.body, { color: colors.mute }]}>{INGEST_COPY.teachSeatOnly}</Text>
        ) : null}

        {phoneGate && teachSeat ? (
          <View style={styles.gaps}>
            <Text style={[type.body, { color: colors.ink }]}>{INGEST_COPY.phoneGate}</Text>
            <Text style={[type.meta, { color: colors.mute }]}>
              You can start a stack on a Chromebook or computer. Split review needs a larger screen.
            </Text>
            {phase === 'waiting' ? (
              <Text style={[type.meta, { color: colors.mute }]} accessibilityLiveRegion="polite">
                {pageCount != null
                  ? INGEST_COPY.progressPages(pagesDone, pageCount)
                  : INGEST_COPY.received}
              </Text>
            ) : null}
            {phase === 'split' || (batchId && pagesDone > 0 && pageCount != null && pagesDone >= pageCount) ? (
              <Text style={[type.body, { color: colors.ink }]}>{INGEST_COPY.splitPhoneWaiting}</Text>
            ) : null}
            <GhostButton label="Close" onPress={handleClose} />
          </View>
        ) : null}

        {showBind ? (
          <View style={styles.gaps}>
            <Text style={[type.meta, { color: colors.mute }]}>Class</Text>
            <View style={styles.wrapChips}>
              {classes.map((klass) => (
                <Chip
                  key={klass.id}
                  label={klass.name}
                  selected={classId === klass.id}
                  onPress={() => setClassId(klass.id)}
                />
              ))}
            </View>
            {!classId ? (
              <Text style={[type.meta, { color: colors.danger }]}>{INGEST_COPY.classRequired}</Text>
            ) : (
              <Text style={[type.meta, { color: colors.mute }]}>
                Upload class stack for {className}
              </Text>
            )}

            <TextField
              label={INGEST_COPY.pagesPerStudent}
              value={pagesPerStudent}
              onChangeText={setPagesPerStudent}
              keyboardType="number-pad"
              editable={!busy}
            />

            <View
              style={[styles.drop, { borderColor: colors.line, backgroundColor: colors.wash }]}
              // @ts-expect-error web drag events on RN View
              onDragOver={(e: { preventDefault?: () => void }) => e.preventDefault?.()}
              onDrop={(e: {
                preventDefault?: () => void;
                dataTransfer?: { files?: FileList };
              }) => {
                e.preventDefault?.();
                if (busy || !classId) return;
                onPickFiles(e.dataTransfer?.files);
              }}
            >
              <Text style={[type.body, { color: colors.mute }]}>{INGEST_COPY.dropZone}</Text>
              <SecondaryButton
                label="Choose files"
                disabled={busy || !classId}
                onPress={openFilePicker}
              />
            </View>

            {picked.length ? (
              <View style={styles.gaps}>
                {picked.map((p) => (
                  <Chip
                    key={p.key}
                    label={`${p.name} (${formatMb(p.file.size)} MB)`}
                    onPress={() => {
                      if (busy) return;
                      setPicked((cur) => cur.filter((x) => x.key !== p.key));
                    }}
                  />
                ))}
              </View>
            ) : null}

            {softWarn ? <Text style={[type.meta, { color: colors.mute }]}>{softWarn}</Text> : null}
            {error ? <Text style={[type.body, { color: colors.danger }]}>{error}</Text> : null}
            {status ? (
              <Text style={[type.meta, { color: colors.mute }]} accessibilityLiveRegion="polite">
                {status}
                {method === 'tus' ? ' (TUS)' : null}
                {progressPct != null ? ` · ${progressPct}%` : null}
              </Text>
            ) : null}

            <PrimaryButton
              label={busy ? 'Uploading…' : INGEST_COPY.entry}
              disabled={busy || !classId || picked.length === 0}
              onPress={() => void startUpload()}
            />
            {busy ? (
              <GhostButton
                label={INGEST_COPY.cancel}
                onPress={() => {
                  abortRef.current?.abort();
                }}
              />
            ) : (
              <GhostButton label="Close" onPress={handleClose} />
            )}
          </View>
        ) : null}

        {showWaiting ? (
          <View style={styles.gaps}>
            <Text style={[type.body, { color: colors.ink }]}>{INGEST_COPY.received}</Text>
            <Text style={[type.meta, { color: colors.mute }]} accessibilityLiveRegion="polite">
              {pageCount != null
                ? INGEST_COPY.progressPages(pagesDone, pageCount)
                : 'Waiting for page count…'}
            </Text>
            {softWarn ? <Text style={[type.meta, { color: colors.mute }]}>{softWarn}</Text> : null}
            {error ? <Text style={[type.body, { color: colors.danger }]}>{error}</Text> : null}
            <GhostButton label="Close" onPress={handleClose} />
          </View>
        ) : null}

        {showPartial ? (
          <View style={styles.gaps}>
            <Text
              style={[type.body, { color: colors.danger }]}
              accessibilityLiveRegion="polite"
            >
              {error ??
                INGEST_COPY.partialBanner(
                  gapMessage ?? INGEST_COPY.splitFailed,
                  pagesDone,
                  pageCount,
                )}
            </Text>
            {pageCount != null ? (
              <Text style={[type.meta, { color: colors.mute }]}>
                {INGEST_COPY.progressPages(pagesDone, pageCount)}
              </Text>
            ) : null}
            <PrimaryButton
              label={retryBusy ? INGEST_COPY.retryRemainderBusy : INGEST_COPY.retryRemainder}
              disabled={retryBusy || abandonBusy}
              onPress={() => void onRetryRemainder()}
            />
            {canAbandonPartial ? (
              <GhostButton
                label={abandonBusy ? INGEST_COPY.abandonPartialBusy : INGEST_COPY.abandonPartial}
                disabled={retryBusy || abandonBusy}
                onPress={() => void onAbandonPartial()}
              />
            ) : (
              <GhostButton
                label="Close"
                disabled={retryBusy || abandonBusy}
                onPress={handleClose}
              />
            )}
          </View>
        ) : null}

        {showFailed ? (
          <View style={styles.gaps}>
            <Text style={[type.body, { color: colors.danger }]}>
              {error ?? INGEST_COPY.splitFailed}
            </Text>
            <GhostButton
              label="Close"
              onPress={() => {
                reset();
                onClose();
              }}
            />
          </View>
        ) : null}
      </FormSheet>

      {batchId && teachSeat ? (
        <SplitReview
          visible={visible && phase === 'split'}
          batchId={batchId}
          onClose={() => {
            reset();
            onClose();
          }}
          onConfirmed={() => {
            reset();
            onClose();
          }}
          onRetryRemainder={() => {
            // Keep batchId; mirror binder partial retry — poll until split_review.
            setGapMessage(null);
            setError(null);
            setStatus(INGEST_COPY.received);
            startPolling(batchId);
          }}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  gaps: { gap: 12 },
  wrapChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  drop: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
});
