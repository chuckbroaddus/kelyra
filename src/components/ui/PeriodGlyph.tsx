/**
 * PeriodGlyph.tsx (GB-04)
 * react-native-svg pie for calendar periods.
 * 24x24, center 12,12, r=9, stroke=1.75, 0° at 12 o'clock clockwise.
 * States and colors per FR-UI-GLYPH-09.
 * Pure render.
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
const R = 9;
const CX = 12;
const CY = 12;
const STROKE = 1.75;

function toRad(d: number): number { return (d * Math.PI) / 180; }

function arcPath(start: number, sweep: number, r = R): string {
  if (sweep <= 0) return '';
  const a0 = toRad(start);
  const a1 = toRad(start + sweep);
  const x0 = CX + r * Math.sin(a0);
  const y0 = CY - r * Math.cos(a0);
  const x1 = CX + r * Math.sin(a1);
  const y1 = CY - r * Math.cos(a1);
  const large = sweep > 180 ? 1 : 0;
  // clockwise per SRS FR-UI-GLYPH-02: use sweep-flag 0 (CW in SVG)
  return `M ${CX} ${CY} L ${x0} ${y0} A ${r} ${r} 0 ${large} 0 ${x1} ${y1} Z`;
}

function ringPath(r: number): string {
  // for hollow, outer - inner? use two circles or stroke
  return '';
}

export function PeriodGlyph({
  id,
  startDeg,
  sweepDeg,
  state = 'idle',
  size = 24,
}: PeriodGlyphProps) {
  const { colors } = useTheme();
  const accent = colors.brand; // use existing theme accent per spec
  const isAll = id === 'all' || sweepDeg >= 359;
  const isYear = id === 'year';
  const isExam = id.startsWith('exam');
  const isProgress = id === 'progress';

  let fill = 'transparent';
  let stroke = CREAM;
  let strokeWidth = STROKE;
  let strokeDash: string | undefined;
  let opacity = 1;
  let ring: React.ReactNode = null;

  if (state === 'selected') {
    fill = accent;
    stroke = accent;
  } else if (state === 'future') {
    opacity = 0.3;
  } else if (state === 'empty') {
    strokeDash = '2 2';
  }

  if (isAll) {
    fill = state === 'selected' ? accent : CREAM;
    stroke = state === 'selected' ? accent : CREAM;
  }

  if (isYear && !isAll) {
    // thin inner ring
    ring = (
      <Circle
        cx={CX}
        cy={CY}
        r={R - 2.5}
        fill="none"
        stroke={state === 'selected' ? accent : CREAM}
        strokeWidth={1}
      />
    );
  }

  if (isExam) {
    // hollow ring + dot per FR-UI-GLYPH-05
    stroke = state === 'selected' ? accent : CREAM;
    ring = (
      <>
        <Circle cx={CX} cy={CY} r={R} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
        <Circle cx={CX} cy={CY} r={2.2} fill={state === 'selected' ? accent : CREAM} />
      </>
    );
  }

  if (isProgress) {
    strokeDash = '2 2';
    fill = 'none';
    stroke = state === 'selected' ? accent : CREAM;
  }

  if (state === 'locked') {
    // small lock/check at bottom (6 o'clock ~ y+)
    ring = (
      <G>
        <Circle cx={CX} cy={CY + 6} r={2} fill={CREAM} />
      </G>
    );
  }

  const wedge = (startDeg >= 0 && sweepDeg > 0 && !isExam) ? (
    <Path
      d={arcPath(startDeg, sweepDeg)}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDash}
    />
  ) : null;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G opacity={opacity}>
        {isExam || isProgress ? null : (
          <Circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        )}
        {wedge}
        {ring}
        {/* TODO: locked check at 6 o'clock, current ring */}
        {state === 'current' && (
          <Circle
            cx={CX}
            cy={CY}
            r={R + 1.5}
            fill="none"
            stroke={accent}
            strokeWidth={2}
          />
        )}
      </G>
    </Svg>
  );
}
