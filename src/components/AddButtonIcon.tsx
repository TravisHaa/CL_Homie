import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

export function AddButtonIcon({ size = 64 }: { size?: number }) {
  const barThickness = Math.max(2, Math.round(size * 0.04));
  const barLength = Math.round(size * 0.34);

  return (
    <View style={[styles.root, { width: size, height: size, borderRadius: size / 2 }]}>
      <LinearGradient
        colors={[
          'rgba(255, 232, 217, 0.96)',
          'rgba(251, 200, 188, 0.9)',
          'rgba(208, 210, 200, 0.9)',
        ]}
        locations={[0, 0.54, 1]}
        start={{ x: 0.18, y: 0.12 }}
        end={{ x: 0.9, y: 0.92 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <View
        style={[
          styles.bar,
          {
            width: barLength,
            height: barThickness,
            borderRadius: barThickness / 2,
          },
        ]}
      />
      <View
        style={[
          styles.bar,
          {
            width: barThickness,
            height: barLength,
            borderRadius: barThickness / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#2E0800',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  glowTop: {
    position: 'absolute',
    top: 4,
    left: 5,
    right: 5,
    height: '44%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  glowBottom: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 5,
    height: '34%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  bar: {
    position: 'absolute',
    backgroundColor: '#2E0800',
  },
});
