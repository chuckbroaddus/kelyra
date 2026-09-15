import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarConfirm } from '@/components/calendar/CalendarConfirm';
import { GhostButton } from '@/components/ui/Button';
import { ScreenOverlay } from '@/components/ui/ScreenOverlay';
import { radius, type } from '@/constants/theme';
import { roleTintColor, roleTintLabel } from '@/lib/calendar/roleTint';
import type { CalendarLayer } from '@/lib/calendar/types';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { useReducedMotion } from '@/lib/ui/reducedMotion';

type Props = {
  visible: boolean;
  layers: CalendarLayer[];
  enabledIds: string[];
  onToggle: (layerId: string) => void;
  onUnsubscribe: (layer: CalendarLayer) => Promise<void>;
  onClose: () => void;
};

/**
 * LF-A Calendars sheet — layer Disable/Enable + team ⋯ Unsubscribe (never Delete).
 * Role-tint dots ≤4. M-SHEET spring; RM = fade.
 * Search appears at ≥8 layers (multical-viz).
 */
export function CalendarsSheet({
  visible,
  layers,
  enabledIds,
  onToggle,
  onUnsubscribe,
  onClose,
}: Props) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const web = Platform.OS === 'web';
  const [query, setQuery] = useState('');
  const [menuLayer, setMenuLayer] = useState<CalendarLayer | null>(null);
  const [unsubLayer, setUnsubLayer] = useState<CalendarLayer | null>(null);
  const [busy, setBusy] = useState(false);
  const sheetY = useRef(new Animated.Value(web ? 0 : 28)).current;
  const sheetOpacity = useRef(new Animated.Value(1)).current;

  const showSearch = layers.length >= 8;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return layers;
    return layers.filter((l) => l.name.toLowerCase().includes(q));
  }, [layers, query]);

  useEffect(() => {
    if (!visible) return;
    sheetY.setValue(web ? 0 : 28);
    sheetOpacity.setValue(reduceMotion ? 0 : 1);
    if (reduceMotion) {
      Animated.timing(sheetOpacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
      return;
    }
    if (web) {
      Animated.timing(sheetOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.spring(sheetY, {
      toValue: 0,
      damping: 18,
      stiffness: 180,
      mass: 0.9,
      useNativeDriver: true,
    }).start();
  }, [visible, web, reduceMotion, sheetY, sheetOpacity]);

  const confirmUnsub = async () => {
    if (!unsubLayer) return;
    setBusy(true);
    try {
      await onUnsubscribe(unsubLayer);
      setUnsubLayer(null);
      setMenuLayer(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ScreenOverlay visible={visible} onRequestClose={onClose}>
        <View
          style={[
            styles.root,
            web && styles.center,
            { backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(26,22,18,0.40)' },
          ]}
        >
          <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close Calendars" />
          <Animated.View
            pointerEvents="auto"
            style={[
              styles.sheet,
              web ? styles.card : styles.bottom,
              {
                backgroundColor: colors.elevated,
                borderColor: colors.line,
                paddingBottom: web ? 16 : 16 + insets.bottom,
                maxHeight: web ? '80%' : '88%',
                opacity: sheetOpacity,
                transform: !web && !reduceMotion ? [{ translateY: sheetY }] : undefined,
              },
            ]}
          >
            <Text style={[styles.title, { color: colors.ink }]} accessibilityRole="header">
              Calendars
            </Text>
            <Text style={[styles.hint, { color: colors.mute }]}>
              Turn off a layer to hide it on your calendar. Others are unchanged. Filters are not
              security.
            </Text>

            {showSearch ? (
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search calendars"
                placeholderTextColor={colors.mute}
                style={[
                  styles.search,
                  { color: colors.ink, borderColor: colors.line, backgroundColor: colors.wash },
                ]}
                accessibilityLabel="Search calendars"
              />
            ) : null}

            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {filtered.map((layer) => {
                const on = enabledIds.includes(layer.id);
                const isTeam = layer.kind === 'team' || layer.canUnsubscribe;
                return (
                  <View
                    key={layer.id}
                    style={[styles.row, { borderBottomColor: colors.line }]}
                  >
                    <View
                      style={[
                        styles.tintDot,
                        { backgroundColor: roleTintColor(layer.roleTint, colors) },
                      ]}
                      accessibilityLabel={roleTintLabel(layer.roleTint)}
                    />
                    <View style={styles.rowMain}>
                      <Text style={[styles.rowTitle, { color: colors.ink }]} numberOfLines={2}>
                        {layer.name}
                      </Text>
                      <Text style={[styles.rowMeta, { color: colors.mute }]}>
                        {layer.kind === 'class_work'
                          ? 'Homework / dues'
                          : layer.kind === 'team'
                            ? 'Sport'
                            : layer.kind}
                        {' · '}
                        {roleTintLabel(layer.roleTint)}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="switch"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={`${on ? 'Disable' : 'Enable'} ${layer.name}`}
                      onPress={() => onToggle(layer.id)}
                      style={[
                        styles.switch,
                        {
                          backgroundColor: on ? colors.brand : colors.wash,
                          borderColor: colors.line,
                        },
                      ]}
                    >
                      <Text style={[styles.switchLabel, { color: on ? colors.elevated : colors.ink }]}>
                        {on ? 'On' : 'Off'}
                      </Text>
                    </Pressable>
                    {isTeam ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`More actions for ${layer.name}`}
                        onPress={() => setMenuLayer(layer)}
                        style={styles.more}
                        hitSlop={8}
                      >
                        <Text style={[styles.moreLabel, { color: colors.ink }]}>⋯</Text>
                      </Pressable>
                    ) : (
                      <View style={styles.moreSpacer} />
                    )}
                  </View>
                );
              })}
              {filtered.length === 0 ? (
                <Text style={[styles.hint, { color: colors.mute }]}>No calendars match.</Text>
              ) : null}
            </ScrollView>

            <GhostButton label="Done" onPress={onClose} />
          </Animated.View>
        </View>
      </ScreenOverlay>

      <ScreenOverlay visible={menuLayer != null} onRequestClose={() => setMenuLayer(null)}>
        <View
          style={[
            styles.root,
            web && styles.center,
            { backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(26,22,18,0.40)' },
          ]}
        >
          <Pressable style={styles.scrim} onPress={() => setMenuLayer(null)} />
          <View
            style={[
              styles.sheet,
              web ? styles.card : styles.bottom,
              {
                backgroundColor: colors.elevated,
                borderColor: colors.line,
                paddingBottom: web ? 16 : 16 + insets.bottom,
              },
            ]}
          >
            <Text style={[styles.title, { color: colors.ink }]}>{menuLayer?.name}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Unsubscribe from ${menuLayer?.name ?? 'team'}`}
              onPress={() => {
                if (menuLayer) setUnsubLayer(menuLayer);
                setMenuLayer(null);
              }}
              style={[styles.menuAction, { borderColor: colors.line }]}
            >
              <Text style={[styles.menuActionLabel, { color: colors.danger }]}>Unsubscribe</Text>
            </Pressable>
            <GhostButton label="Cancel" onPress={() => setMenuLayer(null)} />
          </View>
        </View>
      </ScreenOverlay>

      <CalendarConfirm
        visible={unsubLayer != null}
        title={unsubLayer ? `Leave ${unsubLayer.name}?` : 'Leave team?'}
        body="You will stop seeing games. The team calendar stays for others."
        confirmLabel="Unsubscribe"
        danger
        busy={busy}
        onCancel={() => setUnsubLayer(null)}
        onConfirm={() => void confirmUnsub()}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { flex: 1, minHeight: 48 },
  center: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  sheet: { width: '100%', maxWidth: 440, borderWidth: 1, padding: 16, gap: 12 },
  card: { borderRadius: radius.lg, alignSelf: 'center' },
  bottom: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxWidth: '100%',
  },
  title: type.rowTitle,
  hint: type.meta,
  search: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...type.body,
  },
  list: { flexGrow: 0, maxHeight: 360 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tintDot: { width: 10, height: 10, borderRadius: 5 },
  rowMain: { flex: 1, gap: 2 },
  rowTitle: type.section,
  rowMeta: type.meta,
  switch: {
    minWidth: 48,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  switchLabel: { ...type.meta, fontWeight: '600' },
  more: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreSpacer: { width: 44 },
  moreLabel: { fontSize: 22, lineHeight: 28 },
  menuAction: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  menuActionLabel: type.section,
});
