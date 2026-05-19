import { EventCard } from "@/src/components/calendar/EventCard";
import { EventForm } from "@/src/components/calendar/EventForm";
import { useCalendarEvents } from "@/src/hooks/useCalendarEvents";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  isToday,
  isTomorrow,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CAL = {
  skyBg: "#EEF4FF",
  plateBg: "#DFE9FF",
  plateBorder: "#B6CBFA",
  textStrong: "#2D3D72",
  textSoft: "#6678A8",
  addBtn: "#5E7CE2",
};

function getDateLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "MMM d");
}

export default function CalendarScreen() {
  const { events, isLoading, addEvent, updateEvent } = useCalendarEvents();
  const formRef = useRef<BottomSheetModal>(null);
  const [monthStart, setMonthStart] = useState(() => startOfMonth(new Date()));
  const [selectedEvent, setSelectedEvent] = useState<
    import("@/src/types").CalendarEvent | null
  >(null);

  const monthEnd = endOfMonth(monthStart);
  const monthLabel = format(monthStart, "MMMM yyyy");
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridDays = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  const monthEvents = events.filter((e) => {
    const d = e.startTime.toDate();
    return d >= monthStart && d <= monthEnd;
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.screenContainer}>
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ─────────────────────────────────────────────── */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Calendar</Text>
              <Text style={styles.subtitle}>
                {format(new Date(), "MMMM yyyy")}
              </Text>
            </View>
          </View>

          {/* ── Weekly Grid ─────────────────────────────────────────── */}
          <View style={styles.gridCard}>
            {/* Week navigation row */}
            <View style={styles.weekNav}>
              <TouchableOpacity
                onPress={() => setMonthStart((d) => addMonths(d, -1))}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={CAL.textStrong}
                />
              </TouchableOpacity>
              <Text style={styles.weekLabel}>{monthLabel}</Text>
              <TouchableOpacity
                onPress={() => setMonthStart((d) => addMonths(d, 1))}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={CAL.textStrong}
                />
              </TouchableOpacity>
            </View>

            {/* Day-of-week headers */}
            <View style={styles.dowRow}>
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <Text key={i} style={styles.dowLabel}>
                  {d}
                </Text>
              ))}
            </View>

            {/* 6-row × 7-col monthly grid */}
            {isLoading ? (
              <ActivityIndicator style={styles.loader} color={CAL.addBtn} />
            ) : (
              Array.from({ length: 6 }).map((_, week) => (
                <View key={week} style={styles.dayRow}>
                  {gridDays.slice(week * 7, week * 7 + 7).map((day) => {
                    const dayKey = format(day, "yyyy-MM-dd");
                    const inMonth = day >= monthStart && day <= monthEnd;
                    const today = isToday(day);
                    const dayEvents = inMonth
                      ? monthEvents.filter(
                          (e) =>
                            format(e.startTime.toDate(), "yyyy-MM-dd") ===
                            dayKey,
                        )
                      : [];
                    return (
                      <View key={dayKey} style={styles.dayCell}>
                        <View
                          style={[
                            styles.dayNumCircle,
                            today && styles.dayNumCircleToday,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayNum,
                              !inMonth && styles.dayNumMuted,
                              today && styles.dayNumToday,
                            ]}
                          >
                            {format(day, "d")}
                          </Text>
                        </View>
                        <View style={styles.dotsRow}>
                          {dayEvents.slice(0, 3).map((e) => (
                            <View
                              key={e.id}
                              style={[styles.dot, { backgroundColor: e.color }]}
                            />
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))
            )}
          </View>

          {/* ── All Events List ──────────────────────────────────────── */}
          {isLoading ? (
            <ActivityIndicator style={styles.listLoader} color="#2D3436" />
          ) : events.length === 0 ? (
            <Text style={styles.empty}>No upcoming events</Text>
          ) : (
            events.map((event) => (
              <View key={event.id} style={styles.row}>
                <View style={styles.datePill}>
                  <Text style={styles.dateText}>
                    {getDateLabel(event.startTime.toDate())}
                  </Text>
                </View>
                <EventCard
                  event={event}
                  onPress={() => {
                    setSelectedEvent(event);
                    formRef.current?.present();
                  }}
                />
              </View>
            ))
          )}

          <View style={styles.bottomPad} />
        </ScrollView>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            setSelectedEvent(null);
            formRef.current?.present();
          }}
          activeOpacity={0.8}
          accessibilityLabel="Add event"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>

        <EventForm
          ref={formRef}
          onSubmit={addEvent}
          onUpdate={updateEvent}
          event={selectedEvent}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CAL.skyBg },
  screenContainer: { flex: 1 },
  container: { flex: 1, padding: 20 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: CAL.plateBg,
    borderWidth: 1,
    borderColor: CAL.plateBorder,
  },
  title: { fontSize: 28, fontWeight: "800", color: CAL.textStrong },
  subtitle: { color: CAL.textSoft, marginTop: 4 },

  // Weekly grid card
  gridCard: {
    backgroundColor: CAL.plateBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CAL.plateBorder,
    padding: 12,
    marginBottom: 16,
  },
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  weekLabel: { fontSize: 13, fontWeight: "700", color: CAL.textStrong },
  dowRow: { flexDirection: "row", marginBottom: 4 },
  dowLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "700",
    color: CAL.textSoft,
    letterSpacing: 0.5,
  },
  dayRow: { flexDirection: "row" },
  dayCell: { flex: 1, alignItems: "center", paddingVertical: 3 },
  dayNumCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  dayNumCircleToday: { backgroundColor: CAL.addBtn },
  dayNum: { fontSize: 11, fontWeight: "600", color: CAL.textStrong },
  dayNumMuted: { color: CAL.textSoft, opacity: 0.4 },
  dayNumToday: { color: "#fff" },
  dotsRow: { flexDirection: "row", gap: 2, marginTop: 2, height: 6 },
  dot: { width: 5, height: 5, borderRadius: 3 },

  // Floating action button
  fab: {
    position: "absolute",
    bottom: 50,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: CAL.addBtn,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },

  // All events list
  loader: { marginTop: 24 },
  listLoader: { marginTop: 48 },
  empty: { color: CAL.textSoft, marginTop: 48, textAlign: "center" },
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  datePill: { width: 72, paddingTop: 14 },
  dateText: { fontSize: 12, fontWeight: "700", color: CAL.textSoft },
  bottomPad: { height: 32 },
});
