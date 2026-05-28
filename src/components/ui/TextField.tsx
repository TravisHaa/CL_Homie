import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { PALETTE, RADIUS, SPACING, TYPE } from '@/src/theme/palette';

type Props = TextInputProps & {
  label?: string;
  error?: string | null;
  rightSlot?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

/** V3 form field — cream fill, optional label + error + right slot. */
export function TextField({
  label,
  error,
  rightSlot,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.field, focused && styles.focused, !!error && styles.errored]}>
        <TextInput
          placeholderTextColor={PALETTE.inkFaint}
          style={[styles.input, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {rightSlot ? <View style={styles.right}>{rightSlot}</View> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.sm },
  label: { ...TYPE.label, color: PALETTE.ink },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.field,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: SPACING.base,
    minHeight: 48,
  },
  focused: { borderColor: PALETTE.teal },
  errored: { borderColor: PALETTE.error },
  input: { flex: 1, ...TYPE.body, color: PALETTE.ink, paddingVertical: 12 },
  right: { marginLeft: SPACING.sm },
  error: { ...TYPE.small, color: PALETTE.error },
});
