/**
 * CE-A binder: bind exactly one class + pages-per-student N, then upload.
 * Teach seat / web primary. Phone shows gate copy (BATCH-16).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { GhostButton, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { FormSheet } from '@/components/ui/FormSheet';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import { evaluateFileCaps, formatMb } from '@/lib/ingest/caps';
import { INGEST_COPY } from '@/lib/ingest/copy';
import { gateStackFiles, runClassStackUpload, type StackFile } from '@/lib/ingest/runUpload';
import type { ClassRow } from '@/lib/supabase/types';
import { useTheme } from '@/lib/theme/ThemeProvider';

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
  const abortRef = useRef<AbortController | null>(null);


  useEffect(() => {
    if (visible) {
      setClassId(initialClassId);
      setError(null);
      setStatus(null);
      setProgressPct(null);
      setMethod(null);
    }
  }, [visible, initialClassId]);

  const className = useMemo(
    () => classes.find((c) => c.id === classId)?.name ?? null,
    [classes, classId],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPicked([]);
    setSoftWarn(null);
    setError(null);
    setStatus(null);
    setProgressPct(null);
    setMethod(null);
    setBusy(false);
    setPagesPerStudent('1');
    setClassId(initialClassId);
  }, [initialClassId]);

  const handleClose = () => {
    if (busy) return;
    reset();
    onClose();
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
  };

  const phoneGate = Platform.OS !== 'web';

  return (
    <FormSheet visible={visible} title={INGEST_COPY.binderTitle} onClose={handleClose}>
      {!teachSeat ? (
        <Text style={[type.body, { color: colors.mute }]}>{INGEST_COPY.teachSeatOnly}</Text>
      ) : null}

      {phoneGate && teachSeat ? (
        <View style={styles.gaps}>
          <Text style={[type.body, { color: colors.ink }]}>{INGEST_COPY.phoneGate}</Text>
          <Text style={[type.meta, { color: colors.mute }]}>
            You can start a stack on a Chromebook or computer. Split review needs a larger screen.
          </Text>
          <GhostButton label="Close" onPress={handleClose} />
        </View>
      ) : null}

      {!phoneGate && teachSeat ? (
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
    </FormSheet>
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
