import type { ReactNode } from 'react';
import { View } from 'react-native';

export type IconName =
  | 'setup'
  | 'today'
  | 'capture'
  | 'records'
  | 'family'
  | 'menu'
  | 'close'
  | 'inbox'
  | 'zoomIn'
  | 'zoomOut'
  | 'search'
  | 'bell'
  | 'ask'
  | 'person'
  | 'back'
  | 'send'
  | 'check';

type Props = {
  name: IconName;
  color: string;
  size?: number;
};

export function Icon({ name, color, size = 22 }: Props) {
  const stroke = Math.max(1.5, size * 0.08);
  if (name === 'menu') return <MenuIcon color={color} size={size} stroke={stroke} />;
  if (name === 'close') return <CloseIcon color={color} size={size} stroke={stroke} />;
  if (name === 'setup') return <SetupIcon color={color} size={size} stroke={stroke} />;
  if (name === 'today') return <TodayIcon color={color} size={size} stroke={stroke} />;
  if (name === 'capture') return <CaptureIcon color={color} size={size} stroke={stroke} />;
  if (name === 'records') return <RecordsIcon color={color} size={size} stroke={stroke} />;
  if (name === 'family') return <FamilyIcon color={color} size={size} stroke={stroke} />;
  if (name === 'inbox') return <InboxIcon color={color} size={size} stroke={stroke} />;
  if (name === 'search') return <SearchIcon color={color} size={size} stroke={stroke} />;
  if (name === 'bell') return <BellIcon color={color} size={size} stroke={stroke} />;
  if (name === 'ask') return <AskIcon color={color} size={size} stroke={stroke} />;
  if (name === 'person') return <PersonIcon color={color} size={size} stroke={stroke} />;
  if (name === 'back') return <BackIcon color={color} size={size} stroke={stroke} />;
  if (name === 'send') return <SendIcon color={color} size={size} stroke={stroke} />;
  if (name === 'check') return <CheckIcon color={color} size={size} stroke={stroke} />;
  if (name === 'zoomIn') return <ZoomIcon color={color} size={size} stroke={stroke} plus />;
  return <ZoomIcon color={color} size={size} stroke={stroke} />;
}

function Box({ size, children }: { size: number; children: ReactNode }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </View>
  );
}

function MenuIcon({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  const width = size * 0.68;
  return (
    <Box size={size}>
      <View style={{ gap: size * 0.16, alignItems: 'center' }}>
        <View style={{ width, height: stroke, borderRadius: stroke, backgroundColor: color }} />
        <View style={{ width, height: stroke, borderRadius: stroke, backgroundColor: color }} />
        <View style={{ width, height: stroke, borderRadius: stroke, backgroundColor: color }} />
      </View>
    </Box>
  );
}

function CloseIcon({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  const len = size * 0.62;
  return (
    <Box size={size}>
      <View style={{ width: len, height: len, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            position: 'absolute',
            width: len,
            height: stroke,
            borderRadius: stroke,
            backgroundColor: color,
            transform: [{ rotate: '45deg' }],
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: len,
            height: stroke,
            borderRadius: stroke,
            backgroundColor: color,
            transform: [{ rotate: '-45deg' }],
          }}
        />
      </View>
    </Box>
  );
}

function SetupIcon({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  const head = size * 0.22;
  return (
    <Box size={size}>
      <View style={{ flexDirection: 'row', gap: size * 0.1, alignItems: 'flex-end' }}>
        <View style={{ alignItems: 'center', gap: size * 0.05 }}>
          <View
            style={{
              width: head,
              height: head,
              borderRadius: head / 2,
              borderWidth: stroke,
              borderColor: color,
            }}
          />
          <View
            style={{
              width: size * 0.3,
              height: size * 0.2,
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              borderWidth: stroke,
              borderBottomWidth: 0,
              borderColor: color,
            }}
          />
        </View>
        <View style={{ alignItems: 'center', gap: size * 0.05 }}>
          <View
            style={{
              width: head * 0.86,
              height: head * 0.86,
              borderRadius: head,
              borderWidth: stroke,
              borderColor: color,
            }}
          />
          <View
            style={{
              width: size * 0.26,
              height: size * 0.16,
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
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

function TodayIcon({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  const body = size * 0.52;
  return (
    <Box size={size}>
      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: size * 0.32,
            borderRightWidth: size * 0.32,
            borderBottomWidth: size * 0.24,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: color,
            marginBottom: -stroke,
          }}
        />
        <View
          style={{
            width: body,
            height: size * 0.36,
            borderWidth: stroke,
            borderTopWidth: 0,
            borderColor: color,
          }}
        />
      </View>
    </Box>
  );
}

function CaptureIcon({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  return (
    <Box size={size}>
      <View
        style={{
          width: size * 0.74,
          height: size * 0.52,
          borderRadius: size * 0.1,
          borderWidth: stroke,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: size * 0.22,
            height: size * 0.22,
            borderRadius: size * 0.11,
            borderWidth: stroke,
            borderColor: color,
          }}
        />
      </View>
    </Box>
  );
}

function RecordsIcon({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  const cell = size * 0.22;
  const gap = size * 0.08;
  return (
    <Box size={size}>
      <View style={{ gap, width: cell * 2 + gap }}>
        <View style={{ flexDirection: 'row', gap }}>
          <View style={{ width: cell, height: cell, borderRadius: 3, borderWidth: stroke, borderColor: color }} />
          <View style={{ width: cell, height: cell, borderRadius: 3, borderWidth: stroke, borderColor: color }} />
        </View>
        <View style={{ flexDirection: 'row', gap }}>
          <View style={{ width: cell, height: cell, borderRadius: 3, borderWidth: stroke, borderColor: color }} />
          <View style={{ width: cell, height: cell, borderRadius: 3, borderWidth: stroke, borderColor: color }} />
        </View>
      </View>
    </Box>
  );
}

function FamilyIcon({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  return (
    <Box size={size}>
      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: size * 0.32,
            borderRightWidth: size * 0.32,
            borderBottomWidth: size * 0.26,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: color,
            marginBottom: -stroke,
          }}
        />
        <View
          style={{
            width: size * 0.5,
            height: size * 0.32,
            borderWidth: stroke,
            borderTopWidth: 0,
            borderColor: color,
          }}
        />
      </View>
    </Box>
  );
}

function InboxIcon({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  return (
    <Box size={size}>
      <View
        style={{
          width: size * 0.7,
          height: size * 0.48,
          borderRadius: 4,
          borderWidth: stroke,
          borderColor: color,
          justifyContent: 'flex-end',
          padding: size * 0.08,
        }}
      >
        <View style={{ height: stroke, backgroundColor: color, borderRadius: stroke }} />
      </View>
    </Box>
  );
}

function SearchIcon({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  const lens = size * 0.46;
  return (
    <Box size={size}>
      <View style={{ width: size * 0.72, height: size * 0.72 }}>
        <View
          style={{
            width: lens,
            height: lens,
            borderRadius: lens / 2,
            borderWidth: stroke,
            borderColor: color,
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: size * 0.28,
            height: stroke,
            borderRadius: stroke,
            backgroundColor: color,
            right: 0,
            bottom: size * 0.1,
            transform: [{ rotate: '45deg' }],
          }}
        />
      </View>
    </Box>
  );
}

function BellIcon({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  return (
    <Box size={size}>
      <View style={{ alignItems: 'center' }}>
        <View
          style={{
            width: size * 0.46,
            height: size * 0.42,
            borderTopLeftRadius: size * 0.23,
            borderTopRightRadius: size * 0.23,
            borderWidth: stroke,
            borderColor: color,
            borderBottomWidth: 0,
          }}
        />
        <View
          style={{
            width: size * 0.58,
            height: stroke,
            borderRadius: stroke,
            backgroundColor: color,
          }}
        />
        <View
          style={{
            width: size * 0.12,
            height: size * 0.1,
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
            borderWidth: stroke,
            borderTopWidth: 0,
            borderColor: color,
            marginTop: 1,
          }}
        />
      </View>
    </Box>
  );
}

function AskIcon({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  return (
    <Box size={size}>
      <View
        style={{
          width: size * 0.68,
          height: size * 0.52,
          borderRadius: size * 0.16,
          borderWidth: stroke,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: size * 0.16,
            height: size * 0.16,
            transform: [{ rotate: '45deg' }],
            borderWidth: stroke,
            borderColor: color,
          }}
        />
      </View>
    </Box>
  );
}

function PersonIcon({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  const head = size * 0.26;
  return (
    <Box size={size}>
      <View style={{ alignItems: 'center', gap: size * 0.06 }}>
        <View
          style={{
            width: head,
            height: head,
            borderRadius: head / 2,
            borderWidth: stroke,
            borderColor: color,
          }}
        />
        <View
          style={{
            width: size * 0.5,
            height: size * 0.24,
            borderTopLeftRadius: 10,
            borderTopRightRadius: 10,
            borderWidth: stroke,
            borderBottomWidth: 0,
            borderColor: color,
          }}
        />
      </View>
    </Box>
  );
}

function BackIcon({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  const len = size * 0.32;
  return (
    <Box size={size}>
      <View style={{ width: size * 0.5, height: size * 0.5, justifyContent: 'center' }}>
        <View
          style={{
            width: len,
            height: stroke,
            backgroundColor: color,
            borderRadius: stroke,
            transform: [{ rotate: '-45deg' }],
            marginBottom: -stroke / 2,
            marginLeft: 2,
          }}
        />
        <View
          style={{
            width: len,
            height: stroke,
            backgroundColor: color,
            borderRadius: stroke,
            transform: [{ rotate: '45deg' }],
            marginLeft: 2,
          }}
        />
      </View>
    </Box>
  );
}

function SendIcon({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  return (
    <Box size={size}>
      <View
        style={{
          width: size * 0.42,
          height: size * 0.42,
          borderRightWidth: stroke + 1,
          borderTopWidth: stroke + 1,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </Box>
  );
}

function CheckIcon({ color, size, stroke }: { color: string; size: number; stroke: number }) {
  return (
    <Box size={size}>
      <View style={{ width: size * 0.5, height: size * 0.36 }}>
        <View
          style={{
            position: 'absolute',
            left: 0,
            bottom: size * 0.12,
            width: size * 0.18,
            height: stroke,
            backgroundColor: color,
            borderRadius: stroke,
            transform: [{ rotate: '45deg' }],
          }}
        />
        <View
          style={{
            position: 'absolute',
            left: size * 0.1,
            bottom: size * 0.16,
            width: size * 0.38,
            height: stroke,
            backgroundColor: color,
            borderRadius: stroke,
            transform: [{ rotate: '-45deg' }],
          }}
        />
      </View>
    </Box>
  );
}

function ZoomIcon({
  color,
  size,
  stroke,
  plus,
}: {
  color: string;
  size: number;
  stroke: number;
  plus?: boolean;
}) {
  const len = size * 0.36;
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
            width: len,
            height: stroke,
            borderRadius: stroke,
            backgroundColor: color,
          }}
        />
        {plus ? (
          <View
            style={{
              position: 'absolute',
              width: stroke,
              height: len,
              borderRadius: stroke,
              backgroundColor: color,
            }}
          />
        ) : null}
      </View>
    </Box>
  );
}
