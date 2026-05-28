import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { PALETTE, RADIUS, TYPE } from '@/src/theme/palette';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

const BG: Record<ButtonVariant, string> = {
  primary: PALETTE.teal,
  secondary: PALETTE.sand,
  ghost: 'transparent',
  danger: PALETTE.danger,
};

const FG: Record<ButtonVariant, string> = {
  primary: PALETTE.onAction,
  secondary: PALETTE.ink,
  ghost: PALETTE.ink,
  danger: PALETTE.onAction,
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  leftIcon,
  fullWidth = false,
  style,
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: BG[variant] },
        variant === 'ghost' && styles.ghost,
        fullWidth && styles.fullWidth,
        (pressed || isDisabled) && styles.dim,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={FG[variant]} />
      ) : (
        <View style={styles.row}>
          {leftIcon}
          <Text style={[TYPE.bodyMedium, { color: FG[variant] }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  ghost: { minHeight: 0, paddingHorizontal: 0 },
  fullWidth: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dim: { opacity: 0.6 },
});
