import { StyleSheet, View } from 'react-native';

export function NotificationCard() {
  return (
    <View style={styles.card}>
      <View style={styles.box} />
      <View style={styles.box} />
      <View style={styles.box} />
      <View style={styles.box} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2E0800',
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 28,
    gap: 16,
    width: '75%',
    marginTop: 56,
    transform: [{ rotate: '-1.6deg' }],
    alignSelf: 'center',
    height: 500,
  },
  box: {
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    height: 100,
    width: '100%',
  },
});
