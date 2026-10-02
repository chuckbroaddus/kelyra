/**
 * GB-12 InterviewScreen — chat bubbles, chips, section progress.
 * Never publishes; final confirm hands draft to wizard review.
 */
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GhostButton, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import {
  beginInterview,
  buildExtractionPrompt,
  createSession,
  getNode,
  heuristicExtract,
  mergeExtractions,
  parseExtractionResponse,
  processTurn,
  summaryLines,
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
  className?: string | null;
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
  className,
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
      class_name: className ?? null,
    });
    return beginInterview(s);
  };
  const [first] = useState<TurnOutput>(() => boot());
  const [session, setSession] = useState<InterviewSession>(first.session);
  const [lastOut, setLastOut] = useState<TurnOutput | null>(first);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chips: QuestionChip[] = lastOut?.chips ?? [];
  const lines = useMemo(() => summaryLines(session), [session]);
  const reviewing = session.status === 'confirm';

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
      const extraction = heuristicExtract(session, chipId ? '' : userText, chipId);
      const out = processTurn(session, userText || chipId || '', extraction, {
        chipId,
        notSure: chipId === 'ns',
      });
      applyOut(out);
    },
    [session, applyOut],
  );

  const applyNow = useCallback(() => {
    applyOut(
      processTurn(session, 'Put these answers in the form', { turn_kind: 'navigation', slots: [], navigation: 'open_form' }),
    );
  }, [session, applyOut]);

  const runTurn = useCallback(
    async (userText: string, chipId?: string | null) => {
      setError(null);
      setBusy(true);
      try {
        if (chipId) {
          const label =
            chips.find((c) => c.id === chipId)?.label ??
            (chipId.startsWith('edit:') ? `Change ${lines.find((l) => `edit:${l.node_id}` === chipId)?.text ?? 'that'}` : chipId);
          runLocal(label, chipId);
          return;
        }
        try {
          const pending = session.pending_node ? getNode(session.wizard, session.pending_node) : null;
          const res = await invokeAi<{ ok?: boolean; extraction?: unknown }>('setup-interview', {
            kind: wizard,
            wizard,
            classId: classId ?? undefined,
            schoolId: schoolId ?? undefined,
            userText,
            chipId,
            session: { ...session, transcript: session.transcript.slice(-6), draft: {} },
            prompt: buildExtractionPrompt(session, userText, pending),
          });
          if (res?.extraction) {
            const model = parseExtractionResponse(res.extraction, wizard);
            const extraction = mergeExtractions(session, userText, model);
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
    [session, wizard, classId, schoolId, applyOut, runLocal, chips, lines],
  );

  const soFar = useMemo(() => {
    if (!lines.length) return 'Nothing answered yet';
    return lines.map((l) => l.text).join(' · ');
  }, [lines]);
  return (
    <View style={styles.root}>
      <Card>
        <Text style={[type.meta, { color: c.mute }]} accessibilityLabel="interview-progress">
          {progress}
        </Text>
        {reviewing ? null : (
          <Text style={[type.meta, { color: c.ink, marginTop: 4 }]} numberOfLines={3}>
            So far: {soFar}
          </Text>
        )}
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
      {reviewing && lines.length ? (
        <Card>
          <Text style={[type.body, { color: c.ink, fontWeight: '700' }]}>Your setup — tap a line to change it</Text>
          {lines.map((l) => (
            <Pressable
              key={l.node_id}
              accessibilityRole="button"
              accessibilityLabel={`Change ${l.text}`}
              disabled={busy || l.tag === 'school'}
              onPress={() => void runTurn('', `edit:${l.node_id}`)}
              style={[styles.line, { borderColor: c.line }]}
            >
              <Text style={[type.body, { color: c.ink, flex: 1 }]}>{l.text}</Text>
              <Text style={[type.meta, { color: l.tag === 'default' ? c.danger : c.mute }]}>
                {l.tag === 'school' ? 'Locked by school' : l.tag === 'default' ? 'Usual choice · check' : 'Change'}
              </Text>
            </Pressable>
          ))}
        </Card>
      ) : null}
      <ChipRow>
        {chips.filter((ch) => !(reviewing && ch.action === 'edit')).map((ch) => (
          <Chip key={ch.id} label={ch.label} disabled={busy} onPress={() => void runTurn('', ch.id)} />
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
        <PrimaryButton
          label={reviewing ? 'Put these answers in the form' : 'Open the form'}
          onPress={applyNow}
          disabled={busy}
        />
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
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
