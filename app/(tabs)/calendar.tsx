import { useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isTomorrow } from 'date-fns';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useCalendarEvents } from '@/src/hooks/useCalendarEvents';
import { EventCard } from '@/src/components/calendar/EventCard';
import { EventForm } from '@/src/components/calendar/EventForm';

const CAL = {
  skyBg: '#EEF4FF',
  plateBg: '#DFE9FF',
  plateBorder: '#B6CBFA',
  textStrong: '#2D3D72',
  textSoft: '#6678A8',
  addBtn: '#5E7CE2',
};

function getDateLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'MMM d');
}

export default function CalendarScreen() {
  const { events, isLoading, addEvent } = useCalendarEvents();
  const formRef = useRef<BottomSheetModal>(null);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Calendar</Text>
            <Text style={styles.subtitle}>{format(new Date(), 'MMMM yyyy')}</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => formRef.current?.present()}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator style={styles.loader} color="#2D3436" />
        ) : events.length === 0 ? (
          <Text style={styles.empty}>No upcoming events</Text>
        ) : (
          events.map((event) => (
            <View key={event.id} style={styles.row}>
              <View style={styles.datePill}>
                <Text style={styles.dateText}>{getDateLabel(event.startTime.toDate())}</Text>
              </View>
              <EventCard event={event} />
            </View>
          ))
        )}

        <View style={styles.bottomPad} />
      </ScrollView>

      <EventForm ref={formRef} onSubmit={addEvent} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CAL.skyBg },
  container: { flex: 1, padding: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: CAL.plateBg,
    borderWidth: 1,
    borderColor: CAL.plateBorder,
  },
  title: { fontSize: 28, fontWeight: '800', color: CAL.textStrong },
  subtitle: { color: CAL.textSoft, marginTop: 4 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: CAL.addBtn,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: { marginTop: 48 },
  empty: { color: CAL.textSoft, marginTop: 48, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' },
  datePill: { width: 72, paddingTop: 14 },
  dateText: { fontSize: 12, fontWeight: '700', color: CAL.textSoft },
  bottomPad: { height: 32 },
});
