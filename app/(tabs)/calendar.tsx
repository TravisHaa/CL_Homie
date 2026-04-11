import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const EVENTS = [
  { id: '1', title: 'House meeting', date: 'Today', time: '7:00 PM – 8:00 PM', description: 'Monthly check-in', color: '#6C5CE7' },
  { id: '2', title: 'Grocery run', date: 'Tomorrow', time: '11:00 AM – 12:00 PM', description: 'Whole Foods', color: '#00B894' },
  { id: '3', title: 'Rent due', date: 'Apr 15', time: '12:00 PM', description: 'Venmo landlord', color: '#E17055' },
  { id: '4', title: 'Deep clean day', date: 'Apr 19', time: '10:00 AM – 2:00 PM', description: 'All hands', color: '#FDCB6E' },
  { id: '5', title: "Casey's birthday", date: 'Apr 22', time: 'All day', description: '', color: '#E17055' },
  { id: '6', title: 'Guest staying over', date: 'Apr 25', time: '3:00 PM – Apr 27', description: "Jordan's friend", color: '#00B894' },
];

export default function CalendarScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Calendar</Text>
        <Text style={styles.subtitle}>April 2026</Text>

        {EVENTS.map((event) => (
          <View key={event.id} style={styles.row}>
            <View style={styles.datePill}>
              <Text style={styles.dateText}>{event.date}</Text>
            </View>
            <View style={[styles.card, { borderLeftColor: event.color }]}>
              <Text style={styles.cardTitle}>{event.title}</Text>
              <Text style={styles.cardTime}>{event.time}</Text>
              {!!event.description && <Text style={styles.cardDesc}>{event.description}</Text>}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFBF5' },
  container: { flex: 1, padding: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#2D3436' },
  subtitle: { color: '#636e72', marginTop: 4, marginBottom: 24 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' },
  datePill: { width: 72, paddingTop: 14 },
  dateText: { fontSize: 12, fontWeight: '700', color: '#636e72' },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#2D3436' },
  cardTime: { fontSize: 12, color: '#636e72', marginTop: 2 },
  cardDesc: { fontSize: 12, color: '#636e72', marginTop: 4, fontStyle: 'italic' },
});
