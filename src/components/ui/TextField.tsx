import { forwardRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

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
};

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, style, onFocus, onBlur, ...rest },
  ref,
) {
  const { colors, scheme } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: colors.mute }]}>{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.mute}
        keyboardAppearance={scheme}
        {...rest}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
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
          style,
        ]}
      />
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
});
