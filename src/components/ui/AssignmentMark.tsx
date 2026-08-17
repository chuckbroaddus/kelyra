import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/lib/theme/ThemeProvider';

/** Category glyph for an assignment well. View primitives only — not a tab icon. */
export function AssignmentMark({ category, size = 56 }: { category?: string | null; size?: number }) {
  const { colors } = useTheme();
  const s = size / 56;
  const stroke = Math.max(1.5, 2 * s);
  const ink = colors.mute;

  return (
    <View
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderRadius: size * 0.22,
          backgroundColor: colors.wash,
          borderColor: colors.line,
        },
      ]}
    >
      {glyph(category, s, stroke, ink)}
    </View>
  );
}

function glyph(category: string | null | undefined, s: number, stroke: number, ink: string) {
  if (category === 'quiz') return <QuizGlyph s={s} stroke={stroke} ink={ink} />;
  if (category === 'test' || category === 'midterm' || category === 'final') {
    return <TestGlyph s={s} stroke={stroke} ink={ink} heavy={category !== 'test'} />;
  }
  if (category === 'project') return <ProjectGlyph s={s} stroke={stroke} ink={ink} />;
  if (category === 'presentation') return <TalkGlyph s={s} stroke={stroke} ink={ink} />;
  if (category === 'participation') return <HandsGlyph s={s} stroke={stroke} ink={ink} />;
  if (category === 'behavior') return <StarGlyph s={s} stroke={stroke} ink={ink} />;
  if (category === 'other') return <GridGlyph s={s} stroke={stroke} ink={ink} />;
  return <PageGlyph s={s} stroke={stroke} ink={ink} />;
}

function PageGlyph({ s, stroke, ink }: { s: number; stroke: number; ink: string }) {
  return (
    <View style={{ width: 26 * s, height: 32 * s, borderWidth: stroke, borderColor: ink, borderRadius: 3, padding: 4 * s, justifyContent: 'center', gap: 3 * s }}>
      <View style={{ height: stroke, backgroundColor: ink, borderRadius: stroke }} />
      <View style={{ height: stroke, width: '70%', backgroundColor: ink, borderRadius: stroke }} />
      <View style={{ height: stroke, width: '85%', backgroundColor: ink, borderRadius: stroke }} />
    </View>
  );
}

function QuizGlyph({ s, stroke, ink }: { s: number; stroke: number; ink: string }) {
  return (
    <View style={{ width: 26 * s, height: 32 * s, borderWidth: stroke, borderColor: ink, borderRadius: 3, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 8 * s, height: 8 * s, borderRadius: 4 * s, borderWidth: stroke, borderColor: ink }} />
    </View>
  );
}

function TestGlyph({ s, stroke, ink, heavy }: { s: number; stroke: number; ink: string; heavy: boolean }) {
  return (
    <View style={{ width: 30 * s, height: 32 * s }}>
      <View style={{ position: 'absolute', left: 4 * s, top: 0, width: 22 * s, height: 26 * s, borderWidth: stroke, borderColor: ink, borderRadius: 3 }} />
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 6 * s,
          width: 22 * s,
          height: 26 * s,
          borderWidth: stroke,
          borderColor: ink,
          borderRadius: 3,
          backgroundColor: heavy ? ink : 'transparent',
          opacity: heavy ? 0.18 : 1,
        }}
      />
    </View>
  );
}

function ProjectGlyph({ s, stroke, ink }: { s: number; stroke: number; ink: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: 14 * s, height: 6 * s, borderWidth: stroke, borderBottomWidth: 0, borderColor: ink, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
      <View style={{ width: 28 * s, height: 20 * s, borderWidth: stroke, borderColor: ink, borderRadius: 3 }} />
    </View>
  );
}

function TalkGlyph({ s, stroke, ink }: { s: number; stroke: number; ink: string }) {
  return (
    <View style={{ width: 28 * s, height: 22 * s, borderWidth: stroke, borderColor: ink, borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 10 * s, height: 10 * s, transform: [{ rotate: '45deg' }], borderWidth: stroke, borderColor: ink }} />
    </View>
  );
}

function HandsGlyph({ s, stroke, ink }: { s: number; stroke: number; ink: string }) {
  const head = 8 * s;
  return (
    <View style={{ flexDirection: 'row', gap: 4 * s, alignItems: 'flex-end' }}>
      {[0, 1].map((i) => (
        <View key={i} style={{ alignItems: 'center', gap: 2 * s }}>
          <View style={{ width: head, height: head, borderRadius: head / 2, borderWidth: stroke, borderColor: ink }} />
          <View
            style={{
              width: 12 * s,
              height: 8 * s,
              borderTopLeftRadius: 6,
              borderTopRightRadius: 6,
              borderWidth: stroke,
              borderBottomWidth: 0,
              borderColor: ink,
            }}
          />
        </View>
      ))}
    </View>
  );
}

function StarGlyph({ s, stroke, ink }: { s: number; stroke: number; ink: string }) {
  return (
    <View style={{ width: 24 * s, height: 24 * s, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: 10 * s,
          borderRightWidth: 10 * s,
          borderBottomWidth: 16 * s,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: ink,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: 0,
          height: 0,
          borderLeftWidth: 10 * s,
          borderRightWidth: 10 * s,
          borderTopWidth: 16 * s,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: ink,
          opacity: 0.35,
        }}
      />
    </View>
  );
}

function GridGlyph({ s, stroke, ink }: { s: number; stroke: number; ink: string }) {
  const cell = 10 * s;
  return (
    <View style={{ gap: 3 * s }}>
      <View style={{ flexDirection: 'row', gap: 3 * s }}>
        <View style={{ width: cell, height: cell, borderWidth: stroke, borderColor: ink, borderRadius: 2 }} />
        <View style={{ width: cell, height: cell, borderWidth: stroke, borderColor: ink, borderRadius: 2 }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 3 * s }}>
        <View style={{ width: cell, height: cell, borderWidth: stroke, borderColor: ink, borderRadius: 2 }} />
        <View style={{ width: cell, height: cell, borderWidth: stroke, borderColor: ink, borderRadius: 2 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
