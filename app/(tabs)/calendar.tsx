import { GridBackground } from '@/src/components/GridBackground';
import { EventCard } from "@/src/components/calendar/EventCard";
import { EventForm } from "@/src/components/calendar/EventForm";
import { useCalendarEvents } from "@/src/hooks/useCalendarEvents";
import { useChores } from "@/src/hooks/useChores";
import { useHouseStore } from "@/src/store/houseStore";
import type { CalendarEvent, Chore } from "@/src/types";
import { isChoreDueOn } from "@/src/utils/choreSchedule";
import { Ionicons } from "@expo/vector-icons";
import { AddButtonIcon } from '@/src/components/AddButtonIcon';
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfDay,
  format,
  isAfter,
  isSameDay,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const C = {
  bg:              '#FCF5EE',
  text:            '#2E0800',
  muted:           '#9E9380',
  faint:           '#C8BFB0',
  today:           '#4E7B78',
  todayText:       '#FFFFFF',
  pill:            '#C4B5A8',
  pillText:        '#FFFFFF',
  toggleBg:        '#FFFFFF',
  toggleActive:    '#2D1A0E',
  toggleActiveTxt: '#FFFFFF',
  toggleMutedTxt:  '#9E9380',
  fab:             '#2D1A0E',
};

type ViewMode  = "week" | "month";
type FilterMode = "all" | "chores" | "events" | "others";

// ── Inline chore card styled to match EventCard ──────────────────────
function CalendarChoreCard({ chore }: { chore: Chore }) {
  const memberMap = useHouseStore((s) => s.memberMap);
  const assignee = memberMap[chore.assignedTo];
  return (
    <View style={choreStyles.card}>
      <View style={choreStyles.iconBubble}>
        <Ionicons name="sparkles-outline" size={22} color="#2E0800" />
      </View>

      <View style={choreStyles.body}>
        <Text style={choreStyles.title} numberOfLines={2}>{chore.title}</Text>
        {assignee && (
          <View style={choreStyles.assigneeRow}>
            <View style={[choreStyles.avatar, { backgroundColor: assignee.color ?? '#7B6258' }]}>
              <Text style={choreStyles.avatarInitial}>
                {assignee.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={choreStyles.assigneeTxt} numberOfLines={1}>
              Assigned to {assignee.displayName}
            </Text>
          </View>
        )}
      </View>

      <View style={[choreStyles.pill, chore.isCompleted && choreStyles.pillDone]}>
        <Text style={[choreStyles.pillTxt, chore.isCompleted && choreStyles.pillTxtDone]}>
          {chore.isCompleted ? "Done" : "Pending"}
        </Text>
      </View>
    </View>
  );
}

const choreStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 32,
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 14,
  },
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0E8',
  },
  body: { flex: 1, minWidth: 0, gap: 8 },
  title: { fontSize: 16, fontFamily: 'AlbertSans_600SemiBold', color: '#2E0800' },
  pill: { backgroundColor: '#AFCCD8', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7 },
  pillDone: { backgroundColor: '#BFD9C4' },
  pillTxt: { fontSize: 14, fontFamily: 'AlbertSans_600SemiBold', color: '#FFFFFF' },
  pillTxtDone: { color: '#3A6E45' },
  assigneeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: '#fff', fontSize: 11, fontFamily: 'AlbertSans_700Bold' },
  assigneeTxt: { flex: 1, fontSize: 14, fontFamily: 'AlbertSans_400Regular', color: '#8A7068' },
});

// ────────────────────────────────────────────────────────────────────
export default function CalendarScreen() {
  const router = useRouter();
  const { events, isLoading: eventsLoading, addEvent, updateEvent } = useCalendarEvents();
  const { chores, isLoading: choresLoading } = useChores();
  const formRef = useRef<BottomSheetModal>(null);
  const filterBtnRef = useRef<View>(null);

  const [viewMode, setViewMode]   = useState<ViewMode>("month");
  const [filter, setFilter]       = useState<FilterMode>("all");
  const [showFilter, setShowFilter] = useState(false);
  const [filterPos, setFilterPos] = useState({ top: 0, right: 0 });
  const [monthStart, setMonthStart] = useState(() => startOfMonth(new Date()));
  const [weekStart, setWeekStart]   = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Month derived
  const monthEnd   = endOfMonth(monthStart);
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridDays   = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  // Week derived
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Nav
  const navBack = () => {
    if (viewMode === "week") {
      const next = addWeeks(weekStart, -1);
      setWeekStart(next);
      setMonthStart(startOfMonth(next));
      setSelectedDate(addWeeks(selectedDate, -1));
    } else {
      const next = addMonths(monthStart, -1);
      setMonthStart(next);
      setWeekStart(startOfWeek(next, { weekStartsOn: 0 }));
      setSelectedDate(addMonths(selectedDate, -1));
    }
  };
  const navForward = () => {
    if (viewMode === "week") {
      const next = addWeeks(weekStart, 1);
      setWeekStart(next);
      setMonthStart(startOfMonth(next));
      setSelectedDate(addWeeks(selectedDate, 1));
    } else {
      const next = addMonths(monthStart, 1);
      setMonthStart(next);
      setWeekStart(startOfWeek(next, { weekStartsOn: 0 }));
      setSelectedDate(addMonths(selectedDate, 1));
    }
  };
  const navLabel   = viewMode === "week" ? format(weekStart, "MMMM") : format(monthStart, "MMMM");

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setMonthStart(startOfMonth(today));
    setWeekStart(startOfWeek(today, { weekStartsOn: 0 }));
  };

  // Filter popup
  const openFilter = () => {
    filterBtnRef.current?.measureInWindow((x, y, width, h) => {
      const winWidth = Dimensions.get('window').width;
      setFilterPos({ top: y + h + 6, right: winWidth - x - width });
      setShowFilter(true);
    });
  };

  // Selected-day items + calendar events in the following seven days.
  type ListItem = { kind: 'event'; data: CalendarEvent } | { kind: 'chore'; data: Chore };
  const selectedDayEvents = useMemo(
    () => events.filter((event) => isSameDay(event.startTime.toDate(), selectedDate)),
    [events, selectedDate]
  );
  const selectedDayChores = useMemo(
    () => chores.filter((chore) => isChoreDueOn(chore, selectedDate)),
    [chores, selectedDate]
  );
  const selectedItems: ListItem[] = useMemo(() => {
    const ev: ListItem[] = selectedDayEvents.map((data) => ({ kind: 'event', data }));
    const ch: ListItem[] = selectedDayChores.map((data) => ({ kind: 'chore', data }));
    if (filter === 'events') return ev;
    if (filter === 'chores') return ch;
    if (filter === 'all') return [...ev, ...ch];
    return [];
  }, [filter, selectedDayChores, selectedDayEvents]);
  const upcomingEvents = useMemo(() => {
    if (filter === 'chores' || filter === 'others') return [];
    const selectedDayEnd = endOfDay(selectedDate);
    const upcomingEnd = endOfDay(addDays(selectedDate, 7));
    return events.filter((event) => {
      const start = event.startTime.toDate();
      return isAfter(start, selectedDayEnd) && start <= upcomingEnd;
    });
  }, [events, filter, selectedDate]);

  const selectedSectionTitle = isToday(selectedDate)
    ? "Today's Events"
    : `${format(selectedDate, "MMM d")} Events`;

  const isLoading = eventsLoading || choresLoading;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <GridBackground />
      <View style={styles.screenContainer}>
        <Pressable style={styles.homeBackButton} onPress={() => router.replace('/(tabs)')} hitSlop={10} accessibilityLabel="Back to home">
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

          {/* ── Page title ──────────────────────────────────────────── */}
          <View style={styles.header}>
            <Text style={styles.title}>Your Calendar</Text>
            <Text style={styles.subtitle}>Check out your plans for the week</Text>
          </View>

          {/* ── Nav row ─────────────────────────────────────────────── */}
          <View style={styles.navRow}>
            <View style={styles.monthNav}>
              <TouchableOpacity style={styles.monthNavButton} onPress={navBack} activeOpacity={0.7} hitSlop={8}>
                <Ionicons name="chevron-back" size={18} color={C.text} />
              </TouchableOpacity>
              <Text style={styles.monthNavLabel}>{navLabel}</Text>
              <TouchableOpacity style={styles.monthNavButton} onPress={navForward} activeOpacity={0.7} hitSlop={8}>
                <Ionicons name="chevron-forward" size={18} color={C.text} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.todayButton}
              onPress={goToToday}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Go to today, ${format(new Date(), "MMMM d, yyyy")}`}
            >
              <Text style={styles.dateLabel}>Today’s Date</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === "week" && styles.toggleBtnActive]}
              onPress={() => { setWeekStart(startOfWeek(selectedDate, { weekStartsOn: 0 })); setViewMode("week"); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleTxt, viewMode === "week" && styles.toggleTxtActive]}>Week</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === "month" && styles.toggleBtnActive]}
              onPress={() => { setMonthStart(startOfMonth(selectedDate)); setViewMode("month"); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleTxt, viewMode === "month" && styles.toggleTxtActive]}>Month</Text>
            </TouchableOpacity>
          </View>

          {viewMode === "week" ? (
            /* ── Week pill strip ──────────────────────────────────── */
            <View style={styles.pillRow}>
              {weekDays.map((day) => {
                const dayKey = format(day, "yyyy-MM-dd");
                const today = isToday(day);
                const selected = isSameDay(day, selectedDate);
                const dayEvts = events.filter((e) => format(e.startTime.toDate(), "yyyy-MM-dd") === dayKey);
                return (
                  <Pressable
                    key={dayKey}
                    onPress={() => setSelectedDate(day)}
                    style={[
                      styles.pill,
                      today && !selected && styles.pillCurrentDay,
                      selected && styles.pillToday,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${format(day, "MMMM d")}`}
                  >
                    <Text
                      style={[
                        styles.pillDayName,
                        today && !selected && styles.pillDayNameCurrent,
                        selected && styles.pillDayNameToday,
                      ]}
                    >
                      {format(day, "EEE")}
                    </Text>
                    <View style={styles.pillDayNumCircle}>
                      <Text style={[styles.pillDayNum, today && !selected && styles.pillDayNumCurrent, selected && styles.pillDayNumToday]}>
                        {format(day, "d")}
                      </Text>
                    </View>
                    <View style={styles.pillDots}>
                      {dayEvts.slice(0, 3).map((event) => (
                        <View
                          key={event.id}
                          style={[styles.pillDot, { backgroundColor: event.color || C.text }]}
                        />
                      ))}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            /* ── Month grid ───────────────────────────────────────── */
            <>
              <View style={styles.dowRow}>
                {["S","M","T","W","T","F","S"].map((d, i) => (
                  <Text key={i} style={styles.dowLabel}>{d}</Text>
                ))}
              </View>
              {isLoading ? (
                <ActivityIndicator style={styles.loader} color={C.today} />
              ) : (
                Array.from({ length: 6 }).map((_, week) => (
                  <View key={week} style={styles.dayRow}>
                    {gridDays.slice(week * 7, week * 7 + 7).map((day) => {
                      const dayKey   = format(day, "yyyy-MM-dd");
                      const inMonth  = day >= monthStart && day <= monthEnd;
                      const today    = isToday(day);
                      const selected = isSameDay(day, selectedDate);
                      const dayEvts  = inMonth
                        ? events.filter((e) => format(e.startTime.toDate(), "yyyy-MM-dd") === dayKey)
                        : [];
                      return (
                        <Pressable
                          key={dayKey}
                          style={styles.dayCell}
                          onPress={() => {
                            setSelectedDate(day);
                            setWeekStart(startOfWeek(day, { weekStartsOn: 0 }));
                            if (!inMonth) setMonthStart(startOfMonth(day));
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`Select ${format(day, "MMMM d")}`}
                        >
                          <View
                            style={[
                              styles.dayNumCircle,
                              today && styles.dayNumCircleCurrentDay,
                              selected && styles.dayNumCircleToday,
                            ]}
                          >
                            <Text style={[styles.dayNum, !inMonth && styles.dayNumFaint, selected && styles.dayNumToday]}>
                              {format(day, "d")}
                            </Text>
                          </View>
                          <View style={styles.dotsRow}>
                            {dayEvts.slice(0, 3).map((e) => (
                              <View key={e.id} style={[styles.dot, { backgroundColor: e.color }]} />
                            ))}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                ))
              )}
            </>
          )}

          {/* ── Section row: Add + Filter ────────────────────────────── */}
          <View style={styles.sectionRow}>
            <Text style={styles.addBtn}>{selectedSectionTitle}</Text>

            <View ref={filterBtnRef} collapsable={false}>
              <TouchableOpacity
                style={styles.filterBtn}
                onPress={openFilter}
                activeOpacity={0.7}
                accessibilityLabel={`Filter calendar items, currently ${filter}`}
                accessibilityRole="button"
              >
                <Ionicons name="options-outline" size={15} color={C.text} />
                <Text style={styles.filterBtnText}>
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
                <Ionicons name="chevron-down" size={14} color={C.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Items scheduled for the selected day ────────────────── */}
          <View style={styles.listSection}>
            {isLoading ? (
              <ActivityIndicator style={styles.listLoader} color={C.text} />
            ) : selectedItems.length === 0 ? (
              <Text style={styles.empty}>Nothing scheduled for this day</Text>
            ) : (
              selectedItems.map((item) =>
                item.kind === 'event' ? (
                  <View key={`e-${item.data.id}`} style={styles.row}>
                    <EventCard
                      event={item.data}
                      onPress={() => { setSelectedEvent(item.data); formRef.current?.present(); }}
                    />
                  </View>
                ) : (
                  <View key={`c-${item.data.id}`} style={styles.row}>
                    <CalendarChoreCard chore={item.data} />
                  </View>
                )
              )
            )}
          </View>

          {(filter === 'all' || filter === 'events') && (
            <View style={styles.upcomingSection}>
              <View style={styles.upcomingHeader}>
                <Text style={styles.upcomingTitle}>Upcoming</Text>
                <Text style={styles.upcomingRange}>Next 7 days</Text>
              </View>
              {isLoading ? (
                <ActivityIndicator style={styles.upcomingLoader} color={C.text} />
              ) : upcomingEvents.length === 0 ? (
                <Text style={styles.upcomingEmpty}>No upcoming events</Text>
              ) : (
                upcomingEvents.map((event) => (
                  <View key={`upcoming-${event.id}`} style={styles.row}>
                    <EventCard
                      event={event}
                      onPress={() => { setSelectedEvent(event); formRef.current?.present(); }}
                    />
                  </View>
                ))
              )}
            </View>
          )}

          <View style={styles.bottomPad} />
        </ScrollView>

        {/* ── FAB ───────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => { setSelectedEvent(null); formRef.current?.present(); }}
          activeOpacity={0.8}
          accessibilityLabel="Add event"
          accessibilityRole="button"
        >
          <AddButtonIcon size={64} />
        </TouchableOpacity>

        <EventForm ref={formRef} onSubmit={addEvent} onUpdate={updateEvent} event={selectedEvent} />
      </View>

      {/* ── Filter popup ─────────────────────────────────────────────── */}
      <Modal visible={showFilter} transparent animationType="fade" onRequestClose={() => setShowFilter(false)}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowFilter(false)} />
        <View style={[styles.filterPopup, { top: filterPos.top, right: filterPos.right }]}>
          {(['All', 'Chores', 'Events', 'Others'] as const).map((opt) => {
            const val = opt.toLowerCase() as FilterMode;
            const active = filter === val;
            return (
              <TouchableOpacity
                key={opt}
                style={[styles.filterOption, active && styles.filterOptionActive]}
                onPress={() => { setFilter(val); setShowFilter(false); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterOptionTxt, active && styles.filterOptionTxtActive]}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  screenContainer: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24 },
  homeBackButton: { position: 'absolute', top: 20, left: 20, zIndex: 10 },

  // Page title
  header: { paddingTop: 64, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: "700", fontFamily: "GowunBatang_700Bold", color: C.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: C.muted, marginTop: 4 },

  // Nav row
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  monthNav: { width: 160, flexDirection: "row", alignItems: "center" },
  monthNavButton: { width: 28, alignItems: 'center', justifyContent: 'center' },
  monthNavLabel: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: "700", color: C.text },

  // Toggle
  toggle: {
    alignSelf: 'center',
    flexDirection: "row",
    backgroundColor: C.toggleBg,
    borderRadius: 20,
    padding: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    marginBottom: 20,
  },
  toggleBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 17 },
  toggleBtnActive: { backgroundColor: C.toggleActive },
  toggleTxt: { fontSize: 13, fontWeight: "600", color: C.toggleMutedTxt },
  toggleTxtActive: { color: C.toggleActiveTxt },

  // Today shortcut
  todayButton: {
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dateLabel: { textAlign: "center", fontSize: 13, color: C.text, fontWeight: "600" },

  // Week pill strip
  pillRow: { flexDirection: "row", alignItems: "flex-end", gap: 5, marginBottom: 28 },
  pill: { flex: 1, backgroundColor: C.pill, borderRadius: 28, paddingTop: 10, paddingBottom: 12, alignItems: "center", gap: 4 },
  pillCurrentDay: { backgroundColor: 'rgba(78, 123, 120, 0.22)' },
  pillToday: { backgroundColor: C.today, paddingTop: 14, paddingBottom: 14 },
  pillDayName: { fontSize: 10, fontWeight: "600", color: C.pillText, opacity: 0.85 },
  pillDayNameCurrent: { color: C.today, opacity: 1 },
  pillDayNameToday: { fontSize: 11, fontWeight: "700", opacity: 1 },
  pillDayNumCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  pillDayNum: { fontSize: 15, fontWeight: "700", color: C.pillText },
  pillDayNumCurrent: { color: C.today },
  pillDayNumToday: { fontSize: 20, fontWeight: "800" },
  pillDots: { height: 6, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, marginTop: 2 },
  pillDot: { width: 6, height: 6, borderRadius: 3 },

  // Month grid
  dowRow: { flexDirection: "row", marginBottom: 6 },
  dowLabel: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "600", color: C.muted, letterSpacing: 0.3 },
  dayRow: { flexDirection: "row" },
  dayCell: { flex: 1, alignItems: "center", paddingVertical: 5 },
  dayNumCircle: { width: 30, height: 30, borderRadius: 15, justifyContent: "center", alignItems: "center" },
  dayNumCircleCurrentDay: { backgroundColor: 'rgba(78, 123, 120, 0.2)'},
  dayNumCircleToday: { backgroundColor: C.today },
  dayNum: { fontSize: 14, fontWeight: "500", color: C.text },
  dayNumFaint: { color: C.faint },
  dayNumToday: { color: C.todayText, fontWeight: "700" },
  dotsRow: { flexDirection: "row", gap: 2, marginTop: 2, height: 5 },
  dot: { width: 4, height: 4, borderRadius: 2 },

  // Section row
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
    marginBottom: 16,
  },
  addBtn: { fontSize: 22, fontFamily: "GowunBatang_700Bold", color: "#2E0800" },
  filterBtn: {
    flexDirection: 'row',
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: '#fff',
    width: 112,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  filterBtnText: { fontSize: 14, fontFamily: 'AlbertSans_600SemiBold', color: C.text },

  // Events list
  listSection: {},
  loader: { marginTop: 24 },
  listLoader: { marginTop: 48 },
  empty: { color: C.muted, marginTop: 32, textAlign: "center" },
  row: { marginBottom: 12 },
  upcomingSection: { marginTop: 24 },
  upcomingHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  upcomingTitle: { fontSize: 22, fontFamily: 'GowunBatang_700Bold', color: C.text },
  upcomingRange: { fontSize: 13, fontFamily: 'AlbertSans_500Medium', color: C.muted },
  upcomingLoader: { marginVertical: 16 },
  upcomingEmpty: { color: C.muted, marginBottom: 12 },

  // Filter popup
  filterPopup: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 6,
    minWidth: 140,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  filterOption: { paddingHorizontal: 20, paddingVertical: 12 },
  filterOptionActive: { backgroundColor: '#F5F0EB' },
  filterOptionTxt: { fontSize: 15, color: C.text },
  filterOptionTxtActive: { fontWeight: '700' },

  // FAB
  fab: {
    position: "absolute",
    bottom: 110,
    right: 20,
  },

  bottomPad: { height: 180 },
});
