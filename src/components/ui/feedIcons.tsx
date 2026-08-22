import type { ReactNode } from 'react';
import { View } from 'react-native';

import type { FeedIconName } from '@/lib/feeds/icons';

function Box({ size, children }: { size: number; children: ReactNode }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </View>
  );
}

function Stroke({
  color,
  stroke,
  width,
  height,
  radius,
  style,
}: {
  color: string;
  stroke: number;
  width: number;
  height: number;
  radius?: number;
  style?: object;
}) {
  return (
    <View
      style={{
        width,
        height,
        borderWidth: stroke,
        borderColor: color,
        borderRadius: radius ?? 0,
        ...style,
      }}
    />
  );
}

function Bar({ color, stroke, width, height }: { color: string; stroke: number; width: number; height?: number }) {
  return (
    <View
      style={{
        width,
        height: height ?? stroke,
        borderRadius: stroke,
        backgroundColor: color,
      }}
    />
  );
}

export function FeedGlyph({
  name,
  color,
  size,
  stroke,
}: {
  name: FeedIconName;
  color: string;
  size: number;
  stroke: number;
}) {
  return <FeedDraw name={name} color={color} size={size} stroke={stroke} />;
}

function FeedDraw({
  name,
  color,
  size,
  stroke,
}: {
  name: FeedIconName;
  color: string;
  size: number;
  stroke: number;
}) {
  if (name === 'feedSchool') return <SchoolGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedClass') return <ClassGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedBook') return <BookGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedMath') return <MathGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedBible') return <BibleGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedScience') return <FlaskGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedLab') return <LabGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedArt') return <ArtGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedMusic') return <MusicGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedTheater') return <TheaterGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedSport') return <SportGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedGlobe') return <GlobeGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedMap') return <MapGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedCode') return <CodeGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedPencil') return <PencilGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedEnglish') return <EnglishGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedLanguage') return <LanguageGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedGeom') return <GeomGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedStat') return <StatGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedChem') return <ChemGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedPhysics') return <PhysicsGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedBio') return <BioGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedWorldHistory') return <WorldHistoryGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedUSHistory') return <USHistoryGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedStateHistory') return <StateHistoryGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedGov') return <GovGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedEcon') return <EconGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedRobot') return <RobotGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedShop') return <ShopGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedAg') return <AgGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedHealth') return <HealthGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedNews') return <NewsGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedLibrary') return <LibraryGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedHeart') return <HeartGlyph color={color} size={size} stroke={stroke} />;
  if (name === 'feedStar') return <StarGlyph color={color} size={size} stroke={stroke} />;
  return <SunGlyph color={color} size={size} stroke={stroke} />;
}

function SchoolGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  const m = size * 0.72;
  const body = m * 0.88;
  const cupola = m * 0.2;
  return (
    <Box size={size}>
      <View style={{ width: m, height: m, alignItems: 'center', justifyContent: 'flex-end' }}>
        <View
          style={{
            width: cupola,
            height: m * 0.16,
            borderWidth: stroke,
            borderBottomWidth: 0,
            borderColor: color,
          }}
        />
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: m * 0.5,
            borderRightWidth: m * 0.5,
            borderBottomWidth: m * 0.24,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: color,
            marginBottom: -stroke,
          }}
        />
        <View
          style={{
            width: body,
            height: m * 0.52,
            borderWidth: stroke,
            borderColor: color,
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              width: m * 0.22,
              height: m * 0.28,
              borderWidth: stroke,
              borderBottomWidth: 0,
              borderColor: color,
            }}
          />
        </View>
      </View>
    </Box>
  );
}

function ClassGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  const m = size * 0.72;
  return (
    <Box size={size}>
      <View style={{ width: m, height: m, alignItems: 'center', justifyContent: 'space-between' }}>
        <Stroke color={color} stroke={stroke} width={m} height={m * 0.62} radius={3} />
        <Bar color={color} stroke={stroke} width={stroke} height={m * 0.16} />
        <Bar color={color} stroke={stroke} width={m * 0.56} />
      </View>
    </Box>
  );
}

function BookGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  return (
    <Box size={size}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <Stroke
          color={color}
          stroke={stroke}
          width={size * 0.3}
          height={size * 0.56}
          radius={2}
          style={{ borderRightWidth: 0, transform: [{ skewY: '-8deg' }] }}
        />
        <Stroke color={color} stroke={stroke} width={size * 0.3} height={size * 0.56} radius={2} />
      </View>
    </Box>
  );
}

function MathGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  const leg = size * 0.34;
  return (
    <Box size={size}>
      <View style={{ alignItems: 'center', gap: size * 0.08 }}>
        <Bar color={color} stroke={stroke} width={size * 0.58} />
        <View style={{ flexDirection: 'row', gap: size * 0.18, alignItems: 'flex-start' }}>
          <Bar color={color} stroke={stroke} width={stroke} height={leg} />
          <Bar color={color} stroke={stroke} width={stroke} height={leg} />
        </View>
      </View>
    </Box>
  );
}

function BibleGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  const upright = size * 0.62;
  const beam = size * 0.4;
  return (
    <Box size={size}>
      <View style={{ width: beam, height: upright, alignItems: 'center' }}>
        <Bar color={color} stroke={stroke} width={stroke} height={upright} />
        <View style={{ position: 'absolute', top: upright * 0.22 }}>
          <Bar color={color} stroke={stroke} width={beam} />
        </View>
      </View>
    </Box>
  );
}

function FlaskGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  return (
    <Box size={size}>
      <View style={{ alignItems: 'center' }}>
        <Stroke color={color} stroke={stroke} width={size * 0.22} height={size * 0.2} />
        <View
          style={{
            width: size * 0.48,
            height: size * 0.4,
            borderWidth: stroke,
            borderTopWidth: 0,
            borderBottomLeftRadius: size * 0.24,
            borderBottomRightRadius: size * 0.24,
            borderColor: color,
            marginTop: -stroke,
          }}
        />
      </View>
    </Box>
  );
}

function LabGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  return (
    <Box size={size}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: size * 0.08 }}>
        <Stroke color={color} stroke={stroke} width={size * 0.18} height={size * 0.52} radius={size * 0.09} />
        <Stroke color={color} stroke={stroke} width={size * 0.18} height={size * 0.36} radius={size * 0.09} />
      </View>
    </Box>
  );
}

function ArtGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  return (
    <Box size={size}>
      <View
        style={{
          width: size * 0.62,
          height: size * 0.5,
          borderRadius: size * 0.25,
          borderWidth: stroke,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: size * 0.06,
        }}
      >
        <View style={{ width: size * 0.16, height: size * 0.16, borderRadius: size * 0.08, borderWidth: stroke, borderColor: color }} />
      </View>
    </Box>
  );
}

function MusicGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  return (
    <Box size={size}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', height: size * 0.56 }}>
        <View style={{ width: stroke, height: size * 0.42, backgroundColor: color, borderRadius: stroke }} />
        <Bar color={color} stroke={stroke} width={size * 0.28} />
        <View
          style={{
            position: 'absolute',
            left: -size * 0.08,
            bottom: 0,
            width: size * 0.2,
            height: size * 0.16,
            borderRadius: size * 0.08,
            backgroundColor: color,
          }}
        />
      </View>
    </Box>
  );
}

function TheaterGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  const mask = size * 0.34;
  return (
    <Box size={size}>
      <View style={{ flexDirection: 'row', gap: size * 0.06 }}>
        <Stroke color={color} stroke={stroke} width={mask} height={mask} radius={mask / 2} />
        <Stroke color={color} stroke={stroke} width={mask} height={mask} radius={mask / 2} />
      </View>
    </Box>
  );
}

function SportGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  return (
    <Box size={size}>
      <View
        style={{
          width: size * 0.58,
          height: size * 0.58,
          borderRadius: size * 0.29,
          borderWidth: stroke,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Bar color={color} stroke={stroke} width={size * 0.46} />
      </View>
    </Box>
  );
}

function GlobeGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  return (
    <Box size={size}>
      <View
        style={{
          width: size * 0.62,
          height: size * 0.62,
          borderRadius: size * 0.31,
          borderWidth: stroke,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            position: 'absolute',
            width: size * 0.28,
            height: size * 0.62,
            borderWidth: stroke,
            borderColor: color,
            borderRadius: size * 0.14,
          }}
        />
        <Bar color={color} stroke={stroke} width={size * 0.5} />
      </View>
    </Box>
  );
}

function MapGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  return (
    <Box size={size}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
        <Stroke color={color} stroke={stroke} width={size * 0.22} height={size * 0.48} radius={2} />
        <Stroke color={color} stroke={stroke} width={size * 0.22} height={size * 0.56} radius={2} />
        <Stroke color={color} stroke={stroke} width={size * 0.22} height={size * 0.44} radius={2} />
      </View>
    </Box>
  );
}

function CodeGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  const len = size * 0.22;
  return (
    <Box size={size}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.12 }}>
        <View style={{ width: len, height: len, transform: [{ rotate: '-45deg' }], borderLeftWidth: stroke, borderBottomWidth: stroke, borderColor: color }} />
        <Bar color={color} stroke={stroke} width={stroke} height={size * 0.28} />
        <View style={{ width: len, height: len, transform: [{ rotate: '45deg' }], borderRightWidth: stroke, borderBottomWidth: stroke, borderColor: color }} />
      </View>
    </Box>
  );
}

function PencilGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  return (
    <Box size={size}>
      <View style={{ transform: [{ rotate: '-45deg' }], alignItems: 'center' }}>
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: size * 0.1,
            borderRightWidth: size * 0.1,
            borderBottomWidth: size * 0.14,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: color,
          }}
        />
        <Stroke color={color} stroke={stroke} width={size * 0.2} height={size * 0.42} radius={2} />
      </View>
    </Box>
  );
}

function HeartGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  const bump = size * 0.26;
  return (
    <Box size={size}>
      <View style={{ alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', gap: stroke }}>
          <View style={{ width: bump, height: bump, borderRadius: bump / 2, borderWidth: stroke, borderColor: color }} />
          <View style={{ width: bump, height: bump, borderRadius: bump / 2, borderWidth: stroke, borderColor: color }} />
        </View>
        <View
          style={{
            width: size * 0.48,
            height: size * 0.28,
            borderWidth: stroke,
            borderTopWidth: 0,
            borderBottomLeftRadius: 4,
            borderBottomRightRadius: 4,
            borderColor: color,
            marginTop: -stroke,
            transform: [{ rotate: '180deg' }],
          }}
        />
      </View>
    </Box>
  );
}

function StarGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  return (
    <Box size={size}>
      <View
        style={{
          width: size * 0.28,
          height: size * 0.28,
          borderWidth: stroke,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </Box>
  );
}

function EnglishGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  const w = size * 0.48;
  const h = size * 0.56;
  return (
    <Box size={size}>
      <View style={{ width: w, height: h, alignItems: 'center' }}>
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: stroke,
            height: h,
            borderRadius: stroke,
            backgroundColor: color,
            transform: [{ rotate: '18deg' }],
          }}
        />
        <View
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: stroke,
            height: h,
            borderRadius: stroke,
            backgroundColor: color,
            transform: [{ rotate: '-18deg' }],
          }}
        />
        <View style={{ position: 'absolute', top: h * 0.52 }}>
          <Bar color={color} stroke={stroke} width={w * 0.55} />
        </View>
      </View>
    </Box>
  );
}

function LanguageGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  const bubble = size * 0.34;
  return (
    <Box size={size}>
      <View style={{ width: size * 0.62, height: size * 0.52 }}>
        <Stroke
          color={color}
          stroke={stroke}
          width={bubble}
          height={bubble * 0.78}
          radius={bubble * 0.22}
          style={{ position: 'absolute', left: 0, top: 0 }}
        />
        <Stroke
          color={color}
          stroke={stroke}
          width={bubble}
          height={bubble * 0.78}
          radius={bubble * 0.22}
          style={{ position: 'absolute', right: 0, bottom: 0 }}
        />
      </View>
    </Box>
  );
}

function GeomGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  const w = size * 0.56;
  return (
    <Box size={size}>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: w / 2,
          borderRightWidth: w / 2,
          borderBottomWidth: size * 0.5,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
        }}
      />
    </Box>
  );
}

function StatGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  const bar = size * 0.14;
  return (
    <Box size={size}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: size * 0.08, height: size * 0.52 }}>
        <Bar color={color} stroke={stroke} width={bar} height={size * 0.28} />
        <Bar color={color} stroke={stroke} width={bar} height={size * 0.52} />
        <Bar color={color} stroke={stroke} width={bar} height={size * 0.38} />
      </View>
    </Box>
  );
}

function ChemGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  const atom = size * 0.22;
  return (
    <Box size={size}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Stroke color={color} stroke={stroke} width={atom} height={atom} radius={atom / 2} />
        <Bar color={color} stroke={stroke} width={size * 0.2} />
        <Stroke color={color} stroke={stroke} width={atom * 0.78} height={atom * 0.78} radius={atom} />
      </View>
    </Box>
  );
}

function PhysicsGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  const orbit = size * 0.58;
  const core = size * 0.14;
  return (
    <Box size={size}>
      <View style={{ width: orbit, height: orbit, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            position: 'absolute',
            width: orbit,
            height: orbit * 0.42,
            borderRadius: orbit,
            borderWidth: stroke,
            borderColor: color,
            transform: [{ rotate: '-28deg' }],
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: orbit,
            height: orbit * 0.42,
            borderRadius: orbit,
            borderWidth: stroke,
            borderColor: color,
            transform: [{ rotate: '28deg' }],
          }}
        />
        <View
          style={{
            width: core,
            height: core,
            borderRadius: core / 2,
            backgroundColor: color,
          }}
        />
      </View>
    </Box>
  );
}

function BioGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  return (
    <Box size={size}>
      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            width: size * 0.42,
            height: size * 0.52,
            borderRadius: size * 0.21,
            borderWidth: stroke,
            borderColor: color,
            transform: [{ rotate: '-18deg' }],
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: stroke,
            height: size * 0.36,
            backgroundColor: color,
            borderRadius: stroke,
            transform: [{ rotate: '-18deg' }],
          }}
        />
      </View>
    </Box>
  );
}

function WorldHistoryGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  const d = size * 0.48;
  return (
    <Box size={size}>
      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            width: d,
            height: d,
            borderRadius: d / 2,
            borderWidth: stroke,
            borderColor: color,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Bar color={color} stroke={stroke} width={d * 0.7} />
        </View>
        <View style={{ marginTop: size * 0.04 }}>
          <Bar color={color} stroke={stroke} width={size * 0.28} />
        </View>
      </View>
    </Box>
  );
}

function USHistoryGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  const w = size * 0.64;
  const h = size * 0.44;
  return (
    <Box size={size}>
      <View style={{ width: w, height: h, borderWidth: stroke, borderColor: color, borderRadius: 2, overflow: 'hidden' }}>
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: w * 0.38,
            height: h * 0.5,
            borderRightWidth: stroke,
            borderBottomWidth: stroke,
            borderColor: color,
          }}
        />
        <View style={{ position: 'absolute', right: size * 0.06, top: h * 0.18, width: w * 0.42, height: stroke, backgroundColor: color }} />
        <View style={{ position: 'absolute', left: size * 0.06, bottom: h * 0.18, width: w * 0.78, height: stroke, backgroundColor: color }} />
      </View>
    </Box>
  );
}

function StateHistoryGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  const body = size * 0.42;
  return (
    <Box size={size}>
      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            width: size * 0.28,
            height: size * 0.16,
            borderTopLeftRadius: size * 0.14,
            borderTopRightRadius: size * 0.14,
            borderWidth: stroke,
            borderBottomWidth: 0,
            borderColor: color,
          }}
        />
        <Stroke color={color} stroke={stroke} width={body} height={size * 0.32} />
      </View>
    </Box>
  );
}

function GovGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  const col = size * 0.1;
  return (
    <Box size={size}>
      <View style={{ alignItems: 'center', gap: stroke }}>
        <Bar color={color} stroke={stroke} width={size * 0.52} />
        <View style={{ flexDirection: 'row', gap: size * 0.08, height: size * 0.32, alignItems: 'flex-end' }}>
          <Bar color={color} stroke={stroke} width={col} height={size * 0.32} />
          <Bar color={color} stroke={stroke} width={col} height={size * 0.32} />
          <Bar color={color} stroke={stroke} width={col} height={size * 0.32} />
        </View>
        <Bar color={color} stroke={stroke} width={size * 0.56} />
      </View>
    </Box>
  );
}

function EconGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  return (
    <Box size={size}>
      <View style={{ width: size * 0.56, height: size * 0.48 }}>
        <View
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            width: stroke,
            height: size * 0.48,
            borderRadius: stroke,
            backgroundColor: color,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            width: size * 0.56,
            height: stroke,
            borderRadius: stroke,
            backgroundColor: color,
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: size * 0.08,
            bottom: size * 0.12,
            width: size * 0.42,
            height: stroke,
            borderRadius: stroke,
            backgroundColor: color,
            transform: [{ rotate: '-32deg' }],
          }}
        />
      </View>
    </Box>
  );
}

function RobotGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  const head = size * 0.46;
  const eye = size * 0.1;
  return (
    <Box size={size}>
      <View style={{ alignItems: 'center' }}>
        <Bar color={color} stroke={stroke} width={stroke} height={size * 0.1} />
        <Stroke color={color} stroke={stroke} width={head} height={head} radius={6} />
        <View
          style={{
            position: 'absolute',
            top: size * 0.22,
            flexDirection: 'row',
            gap: size * 0.12,
          }}
        >
          <View style={{ width: eye, height: eye, borderRadius: eye / 2, backgroundColor: color }} />
          <View style={{ width: eye, height: eye, borderRadius: eye / 2, backgroundColor: color }} />
        </View>
      </View>
    </Box>
  );
}

function ShopGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  return (
    <Box size={size}>
      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            width: size * 0.36,
            height: size * 0.28,
            borderWidth: stroke,
            borderBottomWidth: 0,
            borderTopLeftRadius: size * 0.18,
            borderTopRightRadius: size * 0.18,
            borderColor: color,
          }}
        />
        <Bar color={color} stroke={stroke} width={stroke} height={size * 0.32} />
      </View>
    </Box>
  );
}

function AgGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  return (
    <Box size={size}>
      <View style={{ alignItems: 'center', height: size * 0.56, justifyContent: 'flex-end' }}>
        <Bar color={color} stroke={stroke} width={stroke} height={size * 0.5} />
        <View style={{ position: 'absolute', top: 0, flexDirection: 'row', gap: size * 0.16 }}>
          <Bar color={color} stroke={stroke} width={size * 0.18} />
          <Bar color={color} stroke={stroke} width={size * 0.18} />
        </View>
        <View style={{ position: 'absolute', top: size * 0.14, flexDirection: 'row', gap: size * 0.22 }}>
          <Bar color={color} stroke={stroke} width={size * 0.14} />
          <Bar color={color} stroke={stroke} width={size * 0.14} />
        </View>
      </View>
    </Box>
  );
}

function HealthGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  const fruit = size * 0.42;
  return (
    <Box size={size}>
      <View style={{ alignItems: 'center' }}>
        <Bar color={color} stroke={stroke} width={stroke} height={size * 0.12} />
        <View
          style={{
            width: fruit,
            height: fruit,
            borderRadius: fruit / 2,
            borderWidth: stroke,
            borderColor: color,
          }}
        />
      </View>
    </Box>
  );
}

function NewsGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  return (
    <Box size={size}>
      <View style={{ alignItems: 'flex-start', gap: size * 0.08 }}>
        <Stroke color={color} stroke={stroke} width={size * 0.56} height={size * 0.48} radius={2} />
        <View style={{ position: 'absolute', left: size * 0.1, top: size * 0.12, gap: size * 0.08 }}>
          <Bar color={color} stroke={stroke} width={size * 0.36} />
          <Bar color={color} stroke={stroke} width={size * 0.28} />
          <Bar color={color} stroke={stroke} width={size * 0.32} />
        </View>
      </View>
    </Box>
  );
}

function LibraryGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  return (
    <Box size={size}>
      <View style={{ alignItems: 'center', gap: size * 0.06 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: size * 0.06 }}>
          <Stroke color={color} stroke={stroke} width={size * 0.14} height={size * 0.4} radius={2} />
          <Stroke color={color} stroke={stroke} width={size * 0.14} height={size * 0.5} radius={2} />
          <Stroke color={color} stroke={stroke} width={size * 0.14} height={size * 0.34} radius={2} />
        </View>
        <Bar color={color} stroke={stroke} width={size * 0.56} />
      </View>
    </Box>
  );
}

function SunGlyph({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  return (
    <Box size={size}>
      <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
        <View
          style={{
            width: size * 0.32,
            height: size * 0.32,
            borderRadius: size * 0.16,
            borderWidth: stroke,
            borderColor: color,
          }}
        />
        <View style={{ position: 'absolute', top: size * 0.06 }}>
          <Bar color={color} stroke={stroke} width={stroke} height={size * 0.1} />
        </View>
        <View style={{ position: 'absolute', bottom: size * 0.06 }}>
          <Bar color={color} stroke={stroke} width={stroke} height={size * 0.1} />
        </View>
        <View style={{ position: 'absolute', left: size * 0.06 }}>
          <Bar color={color} stroke={stroke} width={size * 0.1} />
        </View>
        <View style={{ position: 'absolute', right: size * 0.06 }}>
          <Bar color={color} stroke={stroke} width={size * 0.1} />
        </View>
      </View>
    </Box>
  );
}
