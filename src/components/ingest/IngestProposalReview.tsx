/**
 * GB-11 review step: per-field confidence + evidence, accept/edit/reject.
 */
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GhostButton, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import { labelForIngestPath, labelForIngestValue } from '@/lib/ingest/fieldLabels';
import { dedupeWarningsAndAmbiguities } from '@/lib/ingest/normalizeFieldValues';
import type { IngestField, IngestProposal } from '@/lib/ingest/proposalTypes';
import { useTheme } from '@/lib/theme/ThemeProvider';
import {
  INGEST_DECISION_LABELS,
  ingestConfidenceLabel,
  ingestStatusLabel,
  plainIngestNotice,
} from '@/lib/grade/plainLabels';

type Decision = 'accept' | 'reject' | 'edit';

type Props = {
  proposal: IngestProposal;
  sourceLabel?: string;
  onApply: (accepted: IngestField[]) => void;
  onDiscard: () => void;
  showRawPaths?: boolean;
};

function confColor(c: number, colors: { good: string; warn: string; danger: string; mute: string }) {
  if (c >= 0.8) return colors.good;
  if (c >= 0.5) return colors.warn;
  return colors.danger;
}

export function IngestProposalReview({
  proposal,
  sourceLabel,
  onApply,
  onDiscard,
  showRawPaths = false,
}: Props) {
  const { colors } = useTheme();
  const [decisions, setDecisions] = useState<Record<string, Decision>>(() => {
    const init: Record<string, Decision> = {};
    for (const f of proposal.fields) {
      if (f.status === 'conflict' || f.status === 'unknown' || f.confidence < 0.5) init[f.path] = 'reject';
      else init[f.path] = 'accept';
    }
    return init;
  });
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [debugOpen, setDebugOpen] = useState(false);

  const rows = useMemo(() => proposal.fields, [proposal.fields]);
  const { warnings, ambiguities } = useMemo(
    () => dedupeWarningsAndAmbiguities(proposal.warnings ?? [], proposal.ambiguities ?? []),
    [proposal.warnings, proposal.ambiguities],
  );

  const notices = useMemo(() => {
    const out: Array<{ key: string; text: string; block: boolean }> = [];
    const seen = new Set<string>();
    for (const a of ambiguities) {
      const t = plainIngestNotice(a.code, a.message.trim())?.trim() ?? '';
      if (!t) continue;
      const k = t.toLowerCase().replace(/^ambiguity:\s*/i, '');
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ key: `a-${a.code}`, text: t, block: false });
    }
    for (const w of warnings) {
      const t = plainIngestNotice(w.code, w.message.trim())?.trim() ?? '';
      if (!t) continue;
      const k = t.toLowerCase().replace(/^ambiguity:\s*/i, '');
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ key: `w-${w.code}`, text: t, block: w.severity === 'block' });
    }
    return out;
  }, [warnings, ambiguities]);

  return (
    <View>
      <Card>
        <Text style={[type.body, { color: colors.ink, fontWeight: '700' }]}>
          We read {sourceLabel ?? 'your document'}. Check each setting below before you use it.
        </Text>
        <Text style={[type.meta, { color: colors.mute, marginTop: 4 }]}>
          Nothing is saved or published yet. For each setting, tap Use, Change, or Skip.
        </Text>
        {notices.map((n) => (
          <Text
            key={n.key}
            style={[type.meta, { color: n.block ? colors.danger : colors.warn, marginTop: 4 }]}
          >
            {n.text}
          </Text>
        ))}
      </Card>

      {rows.map((f) => {
        const decision = decisions[f.path] ?? 'accept';
        const badge = confColor(f.confidence, colors as never);
        const evidence =
          f.evidence.page != null
            ? `Page ${f.evidence.page}: “${f.evidence.quote}”`
            : f.evidence.quote
              ? `“${f.evidence.quote}”`
              : 'We didn’t find this exact wording in the document.';
        const label = labelForIngestPath(f.path);
        const preview = labelForIngestValue(f.path, f.value);
        return (
          <Card key={f.path}>
            <View style={styles.head}>
              <Text style={[type.body, { color: colors.ink, flex: 1, fontWeight: '600' }]}>{label}</Text>
              <Text style={[type.meta, { color: badge }]}>
                {ingestConfidenceLabel(f.confidence)} · {ingestStatusLabel(f.status)}
              </Text>
            </View>
            {(showRawPaths || debugOpen) && (
              <Text style={[type.meta, { color: colors.mute }]}>Key: {f.path}</Text>
            )}
            <Text style={[type.meta, { color: colors.mute }]}>{evidence}</Text>
            <Text style={[type.body, { color: colors.ink, marginTop: 6 }]}>{preview}</Text>
            {decision === 'edit' ? (
              <TextField
                label="Your value"
                value={edits[f.path] ?? preview}
                onChangeText={(t) => setEdits((e) => ({ ...e, [f.path]: t }))}
              />
            ) : null}
            <View style={styles.row}>
              <SecondaryButton
                label="Use"
                onPress={() => setDecisions((d) => ({ ...d, [f.path]: 'accept' }))}
              />
              <SecondaryButton
                label="Change"
                onPress={() => setDecisions((d) => ({ ...d, [f.path]: 'edit' }))}
              />
              <GhostButton
                label="Skip"
                onPress={() => setDecisions((d) => ({ ...d, [f.path]: 'reject' }))}
              />
            </View>
            <Text style={[type.meta, { color: colors.mute }]}>{INGEST_DECISION_LABELS[decision] ?? decision}</Text>
          </Card>
        );
      })}

      <GhostButton
        label={debugOpen ? 'Hide technical details' : 'Show technical details'}
        onPress={() => setDebugOpen((v) => !v)}
      />

      <PrimaryButton
        label="Use these settings"
        onPress={() => {
          const accepted: IngestField[] = [];
          for (const f of rows) {
            const d = decisions[f.path] ?? 'reject';
            if (d === 'reject') continue;
            if (d === 'edit') {
              const raw = edits[f.path] ?? labelForIngestValue(f.path, f.value);
              let value: unknown = raw;
              try {
                value = JSON.parse(raw);
              } catch {
                value = raw;
              }
              accepted.push({ ...f, value, status: 'proposed', confidence: 1 });
            } else {
              accepted.push(f);
            }
          }
          onApply(accepted);
        }}
      />
      <GhostButton label="Throw away" onPress={onDiscard} />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
});
