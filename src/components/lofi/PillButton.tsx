import { TouchableOpacity, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { LOFI } from '@/src/utils/lofiTheme';

type Variant = 'filled' | 'outline';

export function PillButton({
  label,
  onPress,
  variant = 'filled',
  loading = false,
  disabled = false,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
}) {
  const isOutline = variant === 'outline';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.btn,
        isOutline ? styles.outline : styles.filled,
        (disabled || loading) && styles.dim,
      ]}
    >
      <View style={styles.dot} />
      {loading ? (
        <ActivityIndicator size="small" color={LOFI.text} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    height: 46,
    paddingHorizontal: 24,
    gap: 12,
  },
  filled: { backgroundColor: LOFI.surface },
  outline: {
    backgroundColor: LOFI.bg,
    borderWidth: 1,
    borderColor: LOFI.border,
  },
  dim: { opacity: 0.55 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: LOFI.dot,
  },
  label: {
    fontSize: 15,
    color: LOFI.text,
    fontWeight: '500',
  },
});
