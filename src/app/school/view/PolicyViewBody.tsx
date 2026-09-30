/**
 * Shared PolicyView renderer (GB-09). Used by School View + class syllabus-view.
 */
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { PeriodGlyph } from '@/components/ui/PeriodGlyph';
import { glyphsForCalendar, type GradingCalendar } from '@/components/ui/periodGlyphs';
import { type } from '@/constants/theme';
import {
  sectionsForAudience,
  type PolicyViewAudience,
  type PolicyViewModel,
  type PolicyViewTable,
} from '@/lib/grade/policyView';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  model: PolicyViewModel;
  audience?: PolicyViewAudience;
  calendar?: GradingCalendar | null;
};

function WeightBar({ model }: { model: PolicyViewModel }) {
  const { colors } = useTheme();
  const weights = model.weights;
  if (!weights.length) return null;
  return (
    <View style={styles.weightBlock}>
      <View style={[styles.barTrack, { backgroundColor: colors.line }]}>
        {weights.map((w, i) => (
          <View
            key={w.key}
            style={{
              flex: Math.max(w.weight_percent, 0.1),
              backgroundColor: i % 2 === 0 ? colors.brand : colors.brandSoft,
              minHeight: 48,
            }}
            accessibilityLabel={`${w.label} ${w.weight_percent} percent`}
          />
        ))}
      </View>
      <View style={styles.weightLegend}>
        {weights.map((w) => (
          <Text key={w.key} style={[type.meta, { color: colors.ink }]}>
            {w.label} · {w.weight_percent}%
          </Text>
        ))}
      </View>
    </View>
  );
}

function ScaleBar({ model }: { model: PolicyViewModel }) {
  const { colors } = useTheme();
  const scale = model.scale;
  if (!scale) return null;
  return (
    <View style={styles.scaleBlock}>
      <View style={[styles.barTrack, { backgroundColor: colors.line, minHeight: 48 }]}>
        {scale.bands.map((b, i) => {
          const width = Math.max(1, b.max_pct - b.min_pct);
          return (
            <View
              key={`${b.letter}-${i}`}
              style={{
                flex: width,
                backgroundColor: b.passing ? colors.brandSoft : colors.line,
              }}
            />
          );
        })}
      </View>
      <View style={styles.scaleTicks}>
        {scale.bands.map((b, i) => (
          <Text
            key={`${b.letter}-t-${i}`}
            style={[type.meta, { color: colors.mute, flex: 1, textAlign: 'center' }]}
          >
            {b.letter}
            {'\n'}
            {Math.round(b.min_pct)}
          </Text>
        ))}
      </View>
      <Text style={[type.meta, { color: colors.mute, marginTop: 6 }]}>
        {scale.name} · {scale.passing_pct} is passing
      </Text>
    </View>
  );
}

function SimpleTable({ table }: { table: PolicyViewTable }) {
  const { colors } = useTheme();
  return (
    <Card>
      <Text style={[type.body, { color: colors.ink }]}>{table.title}</Text>
      <View style={[styles.tableHead, { borderBottomColor: colors.line }]}>
        {table.columns.map((c) => (
          <Text key={c} style={[type.meta, styles.tableCell, { color: colors.mute, fontWeight: '600' }]}>
            {c}
          </Text>
        ))}
      </View>
      {table.rows.map((row, ri) => (
        <View key={ri} style={styles.tableRow}>
          {row.map((cell, ci) => (
            <Text key={ci} style={[type.meta, styles.tableCell, { color: colors.ink }]}>
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </Card>
  );
}

function CollapsedCard({
  title,
  body,
  defaultOpen,
}: {
  title: string;
  body: string[];
  defaultOpen: boolean;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        style={styles.accordionHit}
      >
        <Text style={[type.body, { color: colors.ink, flex: 1 }]}>{title}</Text>
        <Text style={[type.meta, { color: colors.mute }]}>{open ? 'Hide' : 'Show'}</Text>
      </Pressable>
      {open
        ? body.map((line) => (
            <Text key={line} style={[type.meta, { color: colors.ink, marginTop: 6 }]}>
              {line}
            </Text>
          ))
        : null}
    </Card>
  );
}

export function PolicyViewBody({ model, audience = 'parent', calendar }: Props) {
  const { colors } = useTheme();
  const sections = useMemo(() => sectionsForAudience(model, audience), [model, audience]);
  const glyphs = useMemo(() => (calendar ? glyphsForCalendar(calendar) : []), [calendar]);
  const published =
    model.published_at != null
      ? `Updated ${new Date(model.published_at).toLocaleDateString()}`
      : null;

  return (
    <View style={styles.root}>
      <Text style={[type.title, { color: colors.ink }]}>{model.title}</Text>
      {model.subtitle ? (
        <Text style={[type.meta, { color: colors.mute }]}>{model.subtitle}</Text>
      ) : null}
      <Text style={[type.meta, { color: colors.mute, marginTop: 4 }]}>
        Version {model.version}
        {published ? ` · ${published}` : ''}
      </Text>

      <Card>
        <Text style={[type.body, { color: colors.ink }]}>How the grade is built</Text>
        <Text style={[type.meta, { color: colors.ink, marginTop: 6 }]}>{model.how_built_sentence}</Text>
        <WeightBar model={model} />
      </Card>

      {(glyphs.length > 0 || model.periods.length > 0) && (
        <Card>
          <Text style={[type.body, { color: colors.ink }]}>What counts this term</Text>
          {glyphs.length > 0 ? (
            <View style={styles.glyphRow}>
              {glyphs
                .filter((g) => g.id !== 'all')
                .map((g) => (
                  <View key={g.id} style={styles.glyphItem}>
                    <PeriodGlyph
                      id={g.id}
                      startDeg={g.startDeg}
                      sweepDeg={g.sweepDeg}
                      state="idle"
                      size={28}
                    />
                    <Text style={[type.meta, { color: colors.mute }]}>{g.label}</Text>
                  </View>
                ))}
            </View>
          ) : (
            model.periods.map((p) => (
              <Text key={p.id} style={[type.meta, { color: colors.ink, marginTop: 4 }]}>
                {p.name} ({p.code})
              </Text>
            ))
          )}
        </Card>
      )}

      {model.scale ? (
        <Card>
          <Text style={[type.body, { color: colors.ink }]}>What a letter means</Text>
          <ScaleBar model={model} />
        </Card>
      ) : null}

      {model.worked_example ? (
        <Card>
          <Text style={[type.body, { color: colors.ink }]}>
            Worked example · {model.worked_example.student_name}
          </Text>
          {model.worked_example.scores.map((s) => (
            <Text key={s.label} style={[type.meta, { color: colors.ink, marginTop: 4 }]}>
              {s.label}: {s.raw}/{s.max_points}
            </Text>
          ))}
          <Text style={[type.body, { color: colors.brand, marginTop: 8 }]}>
            {model.worked_example.pct}%
            {model.worked_example.letter ? ` · ${model.worked_example.letter}` : ''}
          </Text>
        </Card>
      ) : null}

      {model.tables.map((t) => (
        <SimpleTable key={t.id} table={t} />
      ))}

      {sections.map((s) => (
        <CollapsedCard
          key={s.id}
          title={s.title}
          body={s.body}
          defaultOpen={!s.collapsed_default}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12, maxWidth: 720 },
  weightBlock: { marginTop: 10, gap: 8 },
  barTrack: { flexDirection: 'row', borderRadius: 8, overflow: 'hidden', minHeight: 48 },
  weightLegend: { gap: 2 },
  scaleBlock: { marginTop: 10 },
  scaleTicks: { flexDirection: 'row', marginTop: 4 },
  glyphRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  glyphItem: { alignItems: 'center', gap: 4, minWidth: 44 },
  tableHead: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
    paddingBottom: 4,
  },
  tableRow: { flexDirection: 'row', paddingVertical: 4 },
  tableCell: { flex: 1, minWidth: 48 },
  accordionHit: { flexDirection: 'row', alignItems: 'center', minHeight: 44, gap: 8 },
});
