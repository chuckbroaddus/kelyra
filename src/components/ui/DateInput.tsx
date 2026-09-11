import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { DateCalendar } from '@/components/ui/dateCalendar';
import { DateWheels } from '@/components/ui/dateWheels';
import { hitSlop, radius, type, webFocus } from '@/constants/theme';
import {
  cancelDateDraft,
  changeDateDraft,
  clearDateDraft,
  commitDateDraft,
  emptyDraft,
  openDateDraft,
  syncCommitted,
  type DateDraft,
} from '@/lib/date/draft';
import { claimDateHost, releaseDateHost } from '@/lib/date/host';
import {
  birthdayBounds,
  formatLocaleDate,
  parseLooseDate,
  partsFromISO,
  rangeError,
  smartDefaultISO,
  type DateMode,
} from '@/lib/date/iso';
import { useTheme } from '@/lib/theme/ThemeProvider';

export type DateInputProps = {
  label: string;
  value: string | null;
  onChange: (iso: string | null) => void;
  min?: string | null;
  max?: string | null;
  required?: boolean;
  clearable?: boolean;
  mode?: DateMode;
  allowTypeIn?: boolean;
  disabled?: boolean;
  errorText?: string | null;
  weekStartsOn?: 0 | 1;
};

const WIDE = 768;

type Anchor = { top: number; left: number; width: number };

export function DateInput({
  label,
  value,
  onChange,
  min: minProp,
  max: maxProp,
  required,
  clearable = true,
  mode = 'generic',
  allowTypeIn,
  disabled,
  errorText,
  weekStartsOn = 0,
}: DateInputProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const instanceId = useId();
  const fieldWrapRef = useRef<View>(null);
  const fieldRef = useRef<TextInput>(null);
  const [draftState, setDraftState] = useState<DateDraft>(() => emptyDraft(value));
  const [typeText, setTypeText] = useState(formatLocaleDate(value) ?? '');
  const [parseError, setParseError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const bounds = useMemo(() => {
    if (mode === 'birthday') {
      const b = birthdayBounds();
      return { min: minProp ?? b.min, max: maxProp ?? b.max };
    }
    return { min: minProp ?? null, max: maxProp ?? null };
  }, [mode, minProp, maxProp]);

  const useCalendar = Platform.OS === 'web' || width >= WIDE;
  const typeInEnabled = allowTypeIn ?? Platform.OS === 'web';
  const display = formatLocaleDate(value) ?? '';
  const placeholder = `Add ${label.toLowerCase()}`;
  const open = draftState.open;
  const draft = draftState.draft ?? smartDefaultISO(mode);
  // Desktop web: field-anchored. Wide tablet / missing measure may stay centered (docked rule).
  const anchorPopover = Platform.OS === 'web' && width >= WIDE && anchor != null;

  useEffect(() => {
    setDraftState((current) => syncCommitted(current, value));
    if (!open) {
      setTypeText(formatLocaleDate(value) ?? '');
      setParseError(null);
    }
  }, [value, open]);

  useEffect(() => () => releaseDateHost(instanceId), [instanceId]);

  const focusField = useCallback(() => {
    if (Platform.OS !== 'web') return;
    requestAnimationFrame(() => {
      fieldRef.current?.focus?.();
    });
  }, []);

  const closeWithoutCommit = useCallback(() => {
    setDraftState((current) => cancelDateDraft(current));
    setParseError(null);
    setTypeText(formatLocaleDate(value) ?? '');
    setAnchor(null);
    releaseDateHost(instanceId);
    focusField();
  }, [focusField, instanceId, value]);

  useEffect(() => {
    if (!open || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeWithoutCommit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeWithoutCommit]);

  const beginOpen = useCallback(
    (nextAnchor: Anchor | null) => {
      setAnchor(nextAnchor);
      claimDateHost(instanceId, () => {
        setDraftState((current) => cancelDateDraft(current));
        setParseError(null);
        setTypeText(formatLocaleDate(value) ?? '');
        setAnchor(null);
        releaseDateHost(instanceId);
      });
      setParseError(null);
      setDraftState((current) => openDateDraft(syncCommitted(current, value), smartDefaultISO(mode)));
      setTypeText(formatLocaleDate(value) ?? '');
    },
    [instanceId, mode, value],
  );

  const openPicker = useCallback(() => {
    if (disabled) return;
    // Desktop web: measure field and anchor. Wide tablet without a good measure stays centered.
    if (Platform.OS === 'web' && width >= WIDE && fieldWrapRef.current?.measureInWindow) {
      fieldWrapRef.current.measureInWindow((x, y, w, h) => {
        const popW = Math.min(360, Math.max(280, w));
        const left = Math.min(Math.max(8, x), Math.max(8, width - popW - 8));
        const top = y + h + 8;
        // If near bottom, still pass anchor; Modal will clamp via maxHeight scroll.
        if (top > height - 120) {
          beginOpen({ top: Math.max(8, y - 8 - 320), left, width: popW });
        } else {
          beginOpen({ top, left, width: popW });
        }
      });
      return;
    }
    beginOpen(null);
  }, [beginOpen, disabled, height, width]);

  const finishCommit = useCallback(
    (iso: string | null) => {
      if (iso) {
        const err = rangeError(iso, bounds.min, bounds.max);
        if (err) {
          setParseError(err);
          return false;
        }
      } else if (required) {
        setParseError(`Add a ${label.toLowerCase()}`);
        return false;
      }
      onChange(iso);
      setDraftState((current) => (iso ? commitDateDraft({ ...current, draft: iso }) : clearDateDraft(current)));
      setParseError(null);
      setTypeText(formatLocaleDate(iso) ?? '');
      setAnchor(null);
      releaseDateHost(instanceId);
      focusField();
      return true;
    },
    [bounds.max, bounds.min, focusField, instanceId, label, onChange, required],
  );

  const onDone = () => {
    finishCommit(draftState.draft);
  };

  const onClear = () => {
    if (!clearable) return;
    onChange(null);
    setDraftState((current) => clearDateDraft(current));
    setParseError(null);
    setTypeText('');
    setAnchor(null);
    releaseDateHost(instanceId);
    focusField();
  };

  const tryParseCommit = (raw: string) => {
    const text = raw.trim();
    if (!text) {
      if (clearable) {
        onClear();
        return;
      }
      setParseError(`Add a ${label.toLowerCase()}`);
      return;
    }
    const iso = parseLooseDate(text);
    if (!iso) {
      setParseError('Enter a valid date');
      return;
    }
    finishCommit(iso);
  };

  const inlineError = errorText || parseError;
  const minYear = bounds.min ? partsFromISO(bounds.min)?.year : undefined;
  const maxYear = bounds.max ? partsFromISO(bounds.max)?.year : undefined;

  return (
    <>
      <View ref={fieldWrapRef} style={styles.wrap}>
        <Text style={[styles.label, { color: colors.mute }]}>{label}</Text>
        {typeInEnabled ? (
          <View>
            <TextInput
              ref={fieldRef}
              accessibilityLabel={label}
              editable={!disabled}
              placeholder={placeholder}
              placeholderTextColor={colors.mute}
              value={focused || open ? typeText : display}
              onChangeText={(text) => {
                setTypeText(text);
                setParseError(null);
              }}
              onFocus={() => {
                if (disabled) return;
                setFocused(true);
                setTypeText(display || typeText);
              }}
              onBlur={() => {
                setFocused(false);
                // Parse only when picker is closed — avoids racing day-click / Cancel.
                if (!disabled && !open && typeText.trim() && typeText.trim() !== display) {
                  tryParseCommit(typeText);
                } else if (!open) {
                  setTypeText(display);
                  setParseError(null);
                }
              }}
              onSubmitEditing={() => tryParseCommit(typeText)}
              style={[
                styles.field,
                {
                  borderColor: focused || open ? colors.brand : colors.line,
                  backgroundColor: colors.elevated,
                  color: disabled ? colors.mute : colors.ink,
                  paddingRight: 40,
                },
                focused && webFocus(colors.brand),
                disabled && styles.disabled,
              ]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${label} calendar`}
              disabled={disabled}
              hitSlop={hitSlop}
              onPress={openPicker}
              style={styles.calendarAffordance}
            >
              <Text style={[type.meta, { color: colors.mute }]}>▾</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled: Boolean(disabled) }}
            disabled={disabled}
            hitSlop={hitSlop}
            onPress={openPicker}
            style={({ pressed }) => [
              styles.field,
              styles.fieldPress,
              {
                borderColor: open ? colors.brand : colors.line,
                backgroundColor: colors.elevated,
              },
              disabled && styles.disabled,
              pressed && !disabled && { opacity: 0.88 },
            ]}
          >
            <Text style={[type.body, { color: display ? colors.ink : colors.mute }]}>
              {display || placeholder}
            </Text>
            <Text style={[type.meta, { color: colors.mute }]}>›</Text>
          </Pressable>
        )}
        {mode === 'birthday' ? (
          <Text style={[type.meta, { color: colors.mute, marginTop: 6 }]}>
            Parents see month and day only.
          </Text>
        ) : null}
        {inlineError ? (
          <Text style={[type.meta, { color: colors.danger, marginTop: 6 }]}>{inlineError}</Text>
        ) : null}
      </View>

      {open && !useCalendar ? (
        <Modal visible animationType="slide" transparent onRequestClose={closeWithoutCommit}>
          <View style={[styles.sheetRoot, { backgroundColor: colors.overlay }]}>
            <Pressable style={styles.scrim} onPress={closeWithoutCommit} accessibilityLabel="Cancel" />
            <View
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.elevated,
                  borderColor: colors.line,
                  paddingBottom: 16 + insets.bottom,
                },
              ]}
            >
              <View style={styles.sheetHeader}>
                <Text style={[type.title, { color: colors.ink, flex: 1 }]}>{label}</Text>
                <GhostButton align="left" label="Cancel" onPress={closeWithoutCommit} />
              </View>
              <DateWheels
                value={draft}
                minYear={minYear}
                maxYear={maxYear}
                onChange={(iso) => setDraftState((current) => changeDateDraft(current, iso))}
              />
              {parseError ? <Text style={[type.meta, { color: colors.danger }]}>{parseError}</Text> : null}
              <View style={styles.sheetActions}>
                {clearable ? <GhostButton align="left" label="Clear" onPress={onClear} /> : null}
                <PrimaryButton label="Done" onPress={onDone} />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {open && useCalendar ? (
        <Modal visible animationType="fade" transparent onRequestClose={closeWithoutCommit}>
          <View
            style={[
              styles.popRoot,
              anchorPopover ? styles.popRootAnchored : null,
              { backgroundColor: colors.overlay },
            ]}
          >
            <Pressable style={styles.scrim} onPress={closeWithoutCommit} accessibilityLabel="Cancel" />
            <View
              // RN web dialog semantics (DATE-13); role not in all RN AccessibilityRole unions.
              accessibilityRole={'dialog' as 'summary'}
              accessibilityLabel={label}
              accessibilityViewIsModal
              style={[
                styles.popover,
                {
                  backgroundColor: colors.elevated,
                  borderColor: colors.line,
                  maxWidth: width >= WIDE ? 360 : Math.max(280, width - 32),
                },
                anchorPopover
                  ? {
                      position: 'absolute',
                      top: anchor!.top,
                      left: anchor!.left,
                      width: anchor!.width,
                      maxWidth: anchor!.width,
                    }
                  : null,
              ]}
            >
              <View style={styles.sheetHeader}>
                <Text style={[type.title, { color: colors.ink, flex: 1 }]}>{label}</Text>
                <GhostButton align="left" label="Cancel" onPress={closeWithoutCommit} />
              </View>
              {typeInEnabled ? (
                <TextInput
                  accessibilityLabel={`${label} typed date`}
                  placeholder="Type a date"
                  placeholderTextColor={colors.mute}
                  value={typeText}
                  onChangeText={(text) => {
                    setTypeText(text);
                    setParseError(null);
                  }}
                  onSubmitEditing={() => tryParseCommit(typeText)}
                  style={[
                    styles.field,
                    {
                      borderColor: colors.line,
                      backgroundColor: colors.card,
                      color: colors.ink,
                    },
                  ]}
                />
              ) : null}
              <DateCalendar
                value={draft}
                min={bounds.min}
                max={bounds.max}
                weekStartsOn={weekStartsOn}
                onNavigate={(iso) => setDraftState((current) => changeDateDraft(current, iso))}
                onSelect={(iso) => finishCommit(iso)}
              />
              {parseError ? <Text style={[type.meta, { color: colors.danger }]}>{parseError}</Text> : null}
              {clearable ? <GhostButton align="left" label="Clear" onPress={onClear} /> : null}
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  label: {
    ...type.meta,
    marginBottom: 8,
  },
  field: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    fontSize: type.body.fontSize,
    lineHeight: type.body.lineHeight,
    fontFamily: type.body.fontFamily,
  },
  fieldPress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calendarAffordance: {
    position: 'absolute',
    right: 4,
    top: 2,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.55,
  },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  popRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  popRootAnchored: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: 0,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  popover: {
    width: '100%',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    zIndex: 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetActions: {
    gap: 8,
  },
});
