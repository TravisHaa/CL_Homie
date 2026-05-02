import { TouchableOpacity, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { HIFI } from '@/src/utils/hifiTheme';

type Variant = 'filled' | 'outline';

export function HiFiButton({
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
        <ActivityIndicator size="small" color={HIFI.text} />
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
    paddingHorizontal: 16,
    gap: 8,
    width: 233,
  },
  filled: { backgroundColor: HIFI.surface },
  outline: {
    backgroundColor: HIFI.bg,
    borderWidth: 1,
    borderColor: HIFI.border,
  },
  dim: { opacity: 0.55 },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: HIFI.dot,
  },
  label: {
    fontSize: 14,
    fontWeight: '400',
    color: HIFI.text,
  },
});
