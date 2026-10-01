/**
 * GB-12 InterviewScreen — chat bubbles, chips, section progress.
 * Never publishes; final confirm hands draft to wizard review.
 */
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GhostButton, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import {
  beginInterview,
  createSession,
  heuristicExtract,
  parseExtractionResponse,
  processTurn,
  type InterviewSession,
  type InterviewWizard,
  type QuestionChip,
  type TurnOutput,
} from '@/lib/interview';
import { invokeAi } from '@/lib/ai/invoke';
import { interviewSlotLine } from '@/lib/grade/plainLabels';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Colors = { ink: string; mute: string; brand: string; danger: string; line: string; elevated: string };

export type InterviewScreenProps = {
  wizard: InterviewWizard;
  schoolId?: string | null;
  classId?: string | null;
  ownerId?: string | null;
  existingDraft?: Record<string, unknown> | null;
  onOpenForm: (draft: Record<string, unknown>, session: InterviewSession) => void;
  onClose?: () => void;
};

function Bubble({
  role,
  text,
  colors,
}: {
  role: 'assistant' | 'user';
  text: string;
  colors: Colors;
}) {
  const mine = role === 'user';
  return (
    <View
      style={[
        styles.bubble,
        {
          alignSelf: mine ? 'flex-end' : 'flex-start',
          backgroundColor: mine ? colors.brand : colors.elevated,
          borderColor: colors.line,
        },
      ]}
    >
      <Text style={[type.body, { color: mine ? '#fff' : colors.ink }]}>{text}</Text>
    </View>
  );
}

export function InterviewScreen({
  wizard,
  schoolId,
  classId,
  ownerId,
  existingDraft,
  onOpenForm,
  onClose,
}: InterviewScreenProps) {
  const { colors } = useTheme();
  const c = colors as Colors;
  const boot = () => {
    const s = createSession({
      wizard,
      school_id: schoolId ?? null,
      class_id: classId ?? null,
      owner_id: ownerId ?? null,
      existing_draft: existingDraft ?? null,
    });
    return beginInterview(s);
  };
  const [session, setSession] = useState<InterviewSession>(() => boot().session);
  const [lastOut, setLastOut] = useState<TurnOutput | null>(() => boot());
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chips: QuestionChip[] = lastOut?.chips ?? [];
  const progress = lastOut?.progress_label ?? '';

  const applyOut = useCallback(
    (out: TurnOutput) => {
      setSession(out.session);
      setLastOut(out);
      if (out.handoff === 'wizard_review') onOpenForm(out.session.draft, out.session);
    },
    [onOpenForm],
  );

  const runLocal = useCallback(
    (userText: string, chipId?: string | null) => {
      const extraction = heuristicExtract(session, userText, chipId);
      const out = processTurn(session, userText || chipId || '', extraction, {
        chipId,
        notSure: chipId === 'ns',
      });
      applyOut(out);
    },
    [session, applyOut],
  );

  const runTurn = useCallback(
    async (userText: string, chipId?: string | null) => {
      setError(null);
      setBusy(true);
      try {
        if (chipId && !userText) {
          runLocal(userText, chipId);
          return;
        }
        try {
          const res = await invokeAi<{ ok?: boolean; extraction?: unknown }>('setup-interview', {
            kind: wizard,
            wizard,
            classId: classId ?? undefined,
            schoolId: schoolId ?? undefined,
            userText,
            chipId,
            session,
          });
          if (res?.extraction) {
            const extraction = parseExtractionResponse(res.extraction, wizard);
            applyOut(processTurn(session, userText, extraction, { chipId }));
            return;
          }
        } catch {
          // local heuristic fallback
        }
        runLocal(userText, chipId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      } finally {
        setBusy(false);
        setText('');
      }
    },
    [session, wizard, classId, schoolId, applyOut, runLocal],
  );

  const soFar = useMemo(() => {
    const keys = Object.keys(session.filled);
    if (!keys.length) return 'Nothing answered yet';
    return keys
      .slice(0, 8)
      .map((k) => interviewSlotLine(k, session.filled[k]?.value))
      .join(' · ');
  }, [session.filled]);

  return (
    <View style={styles.root}>
      <Card>
        <Text style={[type.meta, { color: c.mute }]} accessibilityLabel="interview-progress">
          {progress}
        </Text>
        <Text style={[type.meta, { color: c.ink, marginTop: 4 }]} numberOfLines={3}>
          So far: {soFar}
        </Text>
      </Card>
      <View style={styles.thread}>
        {session.transcript.map((t, i) =>
          t.role === 'system' ? null : (
            <Bubble
              key={`${t.at}-${i}`}
              role={t.role === 'user' ? 'user' : 'assistant'}
              text={t.text}
              colors={c}
            />
          ),
        )}
      </View>
      <ChipRow>
        {chips.map((ch) => (
          <Chip key={ch.id} label={ch.label} disabled={busy} onPress={() => void runTurn(ch.label, ch.id)} />
        ))}
      </ChipRow>
      <TextField
        label="Or type your own answer"
        value={text}
        onChangeText={setText}
        editable={!busy}
        placeholder="Type here"
      />
      <View style={styles.nav}>
        <SecondaryButton
          label="Send"
          onPress={() => {
            if (!text.trim()) return;
            void runTurn(text.trim());
          }}
          disabled={busy || !text.trim()}
        />
        <PrimaryButton label="Open the form" onPress={() => onOpenForm(session.draft, session)} disabled={busy} />
      </View>
      {error ? <Text style={[type.meta, { color: c.danger }]}>{error}</Text> : null}
      {onClose ? <GhostButton label="Close" onPress={onClose} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  thread: { gap: 8, marginVertical: 8 },
  bubble: {
    maxWidth: '92%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  nav: { flexDirection: 'row', gap: 12, marginTop: 8, flexWrap: 'wrap' },
});
