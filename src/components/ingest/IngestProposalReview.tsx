/**
 * GB-11 review step: per-field confidence + evidence, accept/edit/reject.
 */
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GhostButton, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import type { IngestField, IngestProposal } from '@/lib/ingest/proposalTypes';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Decision = 'accept' | 'reject' | 'edit';

type Props = {
  proposal: IngestProposal;
  sourceLabel?: string;
  onApply: (accepted: IngestField[]) => void;
  onDiscard: () => void;
};

function confColor(c: number, colors: { good: string; warn: string; danger: string; mute: string }) {
  if (c >= 0.8) return colors.good;
  if (c >= 0.5) return colors.warn;
  return colors.danger;
}

function valuePreview(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export function IngestProposalReview({ proposal, sourceLabel, onApply, onDiscard }: Props) {
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

  const rows = useMemo(() => proposal.fields, [proposal.fields]);

  return (
    <View>
      <Card>
        <Text style={[type.body, { color: colors.ink, fontWeight: '700' }]}>
          Filled from {sourceLabel ?? proposal.source_id}. Review highlighted fields before saving.
        </Text>
        <Text style={[type.meta, { color: colors.mute, marginTop: 4 }]}>
          AI never publishes. Accept, edit, or reject each field, then continue in the wizard.
        </Text>
        {proposal.warnings.map((w, i) => (
          <Text
            key={`${w.code}-${i}`}
            style={[type.meta, { color: w.severity === 'block' ? colors.danger : colors.warn, marginTop: 4 }]}
          >
            {w.message}
          </Text>
        ))}
        {proposal.ambiguities.map((a, i) => (
          <Text key={`${a.code}-${i}`} style={[type.meta, { color: colors.warn, marginTop: 4 }]}>
            Ambiguity: {a.message}
          </Text>
        ))}
      </Card>

      {rows.map((f) => {
        const decision = decisions[f.path] ?? 'accept';
        const badge = confColor(f.confidence, colors as never);
        const evidence =
          f.evidence.page != null
            ? `p. ${f.evidence.page}: ${f.evidence.quote}`
            : f.evidence.quote || 'No quote';
        return (
          <Card key={f.path}>
            <View style={styles.head}>
              <Text style={[type.body, { color: colors.ink, flex: 1, fontWeight: '600' }]}>{f.path}</Text>
              <Text style={[type.meta, { color: badge }]}>
                {Math.round(f.confidence * 100)}% · {f.status}
              </Text>
            </View>
            <Text style={[type.meta, { color: colors.mute }]}>{evidence}</Text>
            <Text style={[type.body, { color: colors.ink, marginTop: 6 }]}>{valuePreview(f.value)}</Text>
            {decision === 'edit' ? (
              <TextField
                label="Edited value (JSON or text)"
                value={edits[f.path] ?? valuePreview(f.value)}
                onChangeText={(t) => setEdits((e) => ({ ...e, [f.path]: t }))}
              />
            ) : null}
            <View style={styles.row}>
              <SecondaryButton
                label="Accept"
                onPress={() => setDecisions((d) => ({ ...d, [f.path]: 'accept' }))}
              />
              <SecondaryButton
                label="Edit"
                onPress={() => setDecisions((d) => ({ ...d, [f.path]: 'edit' }))}
              />
              <GhostButton
                label="Reject"
                onPress={() => setDecisions((d) => ({ ...d, [f.path]: 'reject' }))}
              />
            </View>
            <Text style={[type.meta, { color: colors.mute }]}>Decision: {decision}</Text>
          </Card>
        );
      })}

      <PrimaryButton
        label="Apply into wizard"
        onPress={() => {
          const accepted: IngestField[] = [];
          for (const f of rows) {
            const d = decisions[f.path] ?? 'reject';
            if (d === 'reject') continue;
            if (d === 'edit') {
              const raw = edits[f.path] ?? valuePreview(f.value);
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
      <GhostButton label="Discard proposal" onPress={onDiscard} />
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
});
