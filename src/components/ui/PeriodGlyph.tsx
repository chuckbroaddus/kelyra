/**
 * PeriodGlyph.tsx (GB-04 + GB-HOTFIX-3)
 * Solid pie-slice glyphs matching legacy term* PNG look:
 * faint full-circle ring + filled wedge (cream idle / accent selected).
 * 24x24, center 12,12, r=9, stroke=1.75, 0° at 12 o'clock clockwise.
 */
import React from 'react';
import Svg, { Circle, Path, G } from 'react-native-svg';
import { useTheme } from '@/lib/theme/ThemeProvider';

export type GlyphState = 'idle' | 'selected' | 'current' | 'locked' | 'empty' | 'future';

export type PeriodGlyphProps = {
  id: string;
  startDeg: number;
  sweepDeg: number;
  state?: GlyphState;
  label?: string;
  storeCode?: string;
  dateRange?: string;
  size?: number;
};

const CREAM = '#E8DCC8';
/** Idle wedge: fully solid cream (Chuck: solid pie slices, like the legacy term icons). */
const CREAM_WEDGE = CREAM;
const CREAM_RING = 'rgba(232, 220, 200, 0.55)';
const R = 9;
const CX = 12;
const CY = 12;
const STROKE = 1.75;

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

/** Pie wedge from 12 o'clock (0°), angles increase clockwise (SRS FR-UI-GLYPH-02). */
function arcPath(start: number, sweep: number, r = R): string {
  if (sweep <= 0) return '';
  if (sweep >= 359.5) {
    // Full disc via two half arcs (single 360° arc is degenerate).
    const x0 = CX;
    const y0 = CY - r;
    return `M ${CX} ${CY} L ${x0} ${y0} A ${r} ${r} 0 1 0 ${x0} ${CY + r} A ${r} ${r} 0 1 0 ${x0} ${y0} Z`;
  }
  const a0 = toRad(start);
  const a1 = toRad(start + sweep);
  const x0 = CX + r * Math.sin(a0);
  const y0 = CY - r * Math.cos(a0);
  const x1 = CX + r * Math.sin(a1);
  const y1 = CY - r * Math.cos(a1);
  const large = sweep > 180 ? 1 : 0;
  // Screen coords are y-down, so sweep-flag 1 draws clockwise (12 → 3 → 6 → 9).
  return `M ${CX} ${CY} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
}

export function PeriodGlyph({
  id,
  startDeg,
  sweepDeg,
  state = 'idle',
  size = 24,
}: PeriodGlyphProps) {
  const { colors } = useTheme();
  const accent = colors.brand;
  const isAll = id === 'all';
  const isYear = id === 'year';
  const isExam = id.startsWith('exam');
  const isProgress = id === 'progress';
  const fullDisc = isAll || isYear || sweepDeg >= 359;
  const selected = state === 'selected';

  let opacity = 1;
  if (state === 'future') opacity = 0.3;

  const ink = selected ? accent : CREAM;
  const wedgeFill = selected ? accent : fullDisc ? CREAM : CREAM_WEDGE;
  const ringStroke = selected ? accent : CREAM_RING;
  const strokeDash = state === 'empty' || isProgress ? '2 2' : undefined;

  if (isExam) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <G opacity={opacity}>
          <Circle cx={CX} cy={CY} r={R} fill="none" stroke={ink} strokeWidth={STROKE} />
          <Circle cx={CX} cy={CY} r={2.2} fill={ink} />
          {state === 'current' ? (
            <Circle cx={CX} cy={CY} r={R + 1.5} fill="none" stroke={accent} strokeWidth={2} />
          ) : null}
        </G>
      </Svg>
    );
  }

  if (isProgress) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <G opacity={opacity}>
          <Circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke={ink}
            strokeWidth={STROKE}
            strokeDasharray="2 2"
          />
          {state === 'current' ? (
            <Circle cx={CX} cy={CY} r={R + 1.5} fill="none" stroke={accent} strokeWidth={2} />
          ) : null}
        </G>
      </Svg>
    );
  }

  const wedge =
    sweepDeg > 0 ? (
      <Path
        d={arcPath(startDeg, sweepDeg)}
        fill={wedgeFill}
        stroke={ink}
        strokeWidth={fullDisc ? 0 : STROKE * 0.5}
        strokeDasharray={strokeDash}
      />
    ) : null;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G opacity={opacity}>
        {/* Faint full-circle ring behind the solid wedge (legacy pie look). */}
        <Circle cx={CX} cy={CY} r={R} fill="none" stroke={ringStroke} strokeWidth={STROKE} />
        {wedge}
        {isYear ? (
          <Circle
            cx={CX}
            cy={CY}
            r={R - 2.5}
            fill="none"
            stroke={ink}
            strokeWidth={1}
          />
        ) : null}
        {state === 'locked' ? <Circle cx={CX} cy={CY + 6} r={2} fill={ink} /> : null}
        {state === 'current' ? (
          <Circle cx={CX} cy={CY} r={R + 1.5} fill="none" stroke={accent} strokeWidth={2} />
        ) : null}
      </G>
    </Svg>
  );
}
