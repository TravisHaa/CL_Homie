import { View, Text, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import type { CalendarEvent } from '@/src/types';

interface Props {
  event: CalendarEvent;
}

export function EventCard({ event }: Props) {
  const start = event.startTime.toDate();
  const end = event.endTime.toDate();
  const timeRange = `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`;

  return (
    <View style={[styles.card, { borderLeftColor: event.color }]}>
      <Text style={styles.title}>{event.title}</Text>
      <Text style={styles.time}>{timeRange}</Text>
      {!!event.description && <Text style={styles.desc}>{event.description}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  title: { fontSize: 15, fontWeight: '600', color: '#2D3436' },
  time: { fontSize: 12, color: '#636e72', marginTop: 2 },
  desc: { fontSize: 12, color: '#636e72', marginTop: 4, fontStyle: 'italic' },
});
