import { forwardRef, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { radius, type, webFocus } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = TextInputProps & {
  label?: string;
  /** Web clipboard paste. Not on the RN TextInput type. */
  onPaste?: (event: {
    preventDefault?: () => void;
    nativeEvent?: { clipboardData?: DataTransfer };
    clipboardData?: DataTransfer;
  }) => void;
  /** Control inside the field's right edge (e.g. a mic). */
  accessory?: ReactNode;
  /** `center` = vertically centered (single line); `bottom` = bottom-right corner (multiline). */
  accessoryPlacement?: 'center' | 'bottom';
  /** Second control in the field's top-right corner (e.g. attach "+"). */
  topAccessory?: ReactNode;
};

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, style, onFocus, onBlur, accessory, accessoryPlacement = 'center', topAccessory, ...rest },
  ref,
) {
  const { colors, scheme } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: colors.mute }]}>{label}</Text> : null}
      <View style={styles.inputWrap}>
        <TextInput
          ref={ref}
          placeholderTextColor={colors.mute}
          keyboardAppearance={scheme}
          {...rest}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
            if (Platform.OS === 'web') {
              const node = event.target as unknown as {
                scrollIntoView?: (opts?: ScrollIntoViewOptions) => void;
              };
              requestAnimationFrame(() => node.scrollIntoView?.({ block: 'center', inline: 'nearest' }));
            }
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            styles.field,
            {
              borderColor: focused ? colors.brand : colors.line,
              backgroundColor: colors.elevated,
              color: colors.ink,
            },
            rest.multiline && styles.multiline,
            focused && webFocus(colors.brand),
            accessory || topAccessory ? styles.withAccessory : null,
            style,
          ]}
        />
        {accessory ? (
          <View
            pointerEvents="box-none"
            style={accessoryPlacement === 'bottom' ? styles.accessoryBottom : styles.accessoryCenter}
          >
            {accessory}
          </View>
        ) : null}
        {topAccessory ? (
          <View pointerEvents="box-none" style={styles.accessoryTop}>
            {topAccessory}
          </View>
        ) : null}
      </View>
    </View>
  );
});

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
  multiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  inputWrap: {
    position: 'relative',
    width: '100%',
  },
  withAccessory: {
    paddingRight: 48,
  },
  accessoryCenter: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 4,
    justifyContent: 'center',
  },
  accessoryTop: {
    position: 'absolute',
    right: 4,
    top: 4,
  },
  accessoryBottom: {
    position: 'absolute',
    right: 4,
    bottom: 4,
  },
});
