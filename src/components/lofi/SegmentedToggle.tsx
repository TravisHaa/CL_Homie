import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { LOFI } from '@/src/utils/lofiTheme';

export function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.container}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.segment, active && styles.active]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.8}
          >
            <Text style={styles.label}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: LOFI.surfaceMuted,
    borderRadius: 999,
    padding: 4,
    alignSelf: 'center',
  },
  segment: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
  },
  active: { backgroundColor: LOFI.surface },
  label: { fontSize: 15, color: LOFI.text, fontWeight: '500' },
});
