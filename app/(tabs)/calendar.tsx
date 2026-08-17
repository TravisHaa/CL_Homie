import { GridBackground } from '@/src/components/GridBackground';
import { EventCard } from "@/src/components/calendar/EventCard";
import { EventForm } from "@/src/components/calendar/EventForm";
import { useCalendarEvents } from "@/src/hooks/useCalendarEvents";
import { useChores } from "@/src/hooks/useChores";
import { useHouseStore } from "@/src/store/houseStore";
import type { CalendarEvent, Chore } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import AddButtonSvg from '@/assets/images/Add-Button.svg';
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useRef, useState } from "react";
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
  text:            '#3B1F0E',
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
      <View style={choreStyles.topRow}>
        <Text style={choreStyles.title} numberOfLines={2}>{chore.title}</Text>
        <View style={[choreStyles.pill, chore.isCompleted && choreStyles.pillDone]}>
          <Text style={[choreStyles.pillTxt, chore.isCompleted && choreStyles.pillTxtDone]}>
            {chore.isCompleted ? "Done" : "Pending"}
          </Text>
        </View>
      </View>
      {assignee && (
        <View style={choreStyles.assigneeRow}>
          <View style={[choreStyles.avatar, { backgroundColor: assignee.color ?? '#6B5E52' }]}>
            <Text style={choreStyles.avatarInitial}>
              {assignee.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={choreStyles.assigneeTxt}>Assigned to {assignee.displayName}</Text>
        </View>
      )}
    </View>
  );
}

const choreStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
  title: { flex: 1, fontSize: 15, fontFamily: 'AlbertSans_600SemiBold', color: '#2D1A0E' },
  pill: { backgroundColor: '#F5D9B0', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  pillDone: { backgroundColor: '#D4E8D0' },
  pillTxt: { fontSize: 12, fontFamily: 'AlbertSans_600SemiBold', color: '#8A5A1A' },
  pillTxtDone: { color: '#3A6E45' },
  assigneeRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  avatar: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { color: '#fff', fontSize: 11, fontFamily: 'AlbertSans_700Bold' },
  assigneeTxt: { fontSize: 12, fontFamily: 'AlbertSans_400Regular', color: '#9E9380' },
});

// ────────────────────────────────────────────────────────────────────
export default function CalendarScreen() {
  const { events, isLoading: eventsLoading, addEvent, updateEvent, deleteEvent } = useCalendarEvents();
  const { chores, isLoading: choresLoading } = useChores();
  const formRef = useRef<BottomSheetModal>(null);
  const filterBtnRef = useRef<View>(null);

  const [viewMode, setViewMode]   = useState<ViewMode>("month");
  const [filter, setFilter]       = useState<FilterMode>("all");
  const [showFilter, setShowFilter] = useState(false);
  const [filterPos, setFilterPos] = useState({ top: 0, right: 0 });
  const [monthStart, setMonthStart] = useState(() => startOfMonth(new Date()));
  const [weekStart, setWeekStart]   = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Month derived
  const monthEnd   = endOfMonth(monthStart);
  const gridStart  = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridDays   = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  // Week derived
  const weekEnd  = endOfWeek(weekStart, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const weekEvents = events.filter((e) => {
    const d = e.startTime.toDate();
    return d >= weekStart && d <= weekEnd;
  });
  const visibleEvents = viewMode === "week" ? weekEvents : events;

  // Nav
  const navBack = () => {
    if (viewMode === "week") {
      const next = addWeeks(weekStart, -1);
      setWeekStart(next);
      setMonthStart(startOfMonth(next));
    } else {
      const next = addMonths(monthStart, -1);
      setMonthStart(next);
      setWeekStart(startOfWeek(next, { weekStartsOn: 0 }));
    }
  };
  const navForward = () => {
    if (viewMode === "week") {
      const next = addWeeks(weekStart, 1);
      setWeekStart(next);
      setMonthStart(startOfMonth(next));
    } else {
      const next = addMonths(monthStart, 1);
      setMonthStart(next);
      setWeekStart(startOfWeek(next, { weekStartsOn: 0 }));
    }
  };
  const navLabel   = viewMode === "week" ? format(weekStart, "MMMM") : format(monthStart, "MMMM");

  // Filter popup
  const openFilter = () => {
    filterBtnRef.current?.measureInWindow((x, y, _w, h) => {
      const winWidth = Dimensions.get('window').width;
      setFilterPos({ top: y + h + 6, right: winWidth - x - 32 });
      setShowFilter(true);
    });
  };

  // Unified filtered list
  type ListItem = { kind: 'event'; data: CalendarEvent } | { kind: 'chore'; data: Chore };
  const filteredItems: ListItem[] = (() => {
    const ev: ListItem[] = visibleEvents.map((d) => ({ kind: 'event', data: d }));
    const ch: ListItem[] = chores.map((d) => ({ kind: 'chore', data: d }));
    if (filter === 'events') return ev;
    if (filter === 'chores') return ch;
    if (filter === 'all')    return [...ev, ...ch];
    return [];
  })();

  const isLoading = eventsLoading || choresLoading;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <GridBackground />
      <View style={styles.screenContainer}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

          {/* ── Page title ──────────────────────────────────────────── */}
          <View style={styles.header}>
            <Text style={styles.title}>Your Calendar</Text>
            <Text style={styles.subtitle}>Check out your plans for the week</Text>
          </View>

          {/* ── Nav row ─────────────────────────────────────────────── */}
          <View style={styles.navRow}>
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={navBack} activeOpacity={0.7} hitSlop={8}>
                <Ionicons name="chevron-back" size={18} color={C.text} />
              </TouchableOpacity>
              <Text style={styles.monthNavLabel}>{navLabel}</Text>
              <TouchableOpacity onPress={navForward} activeOpacity={0.7} hitSlop={8}>
                <Ionicons name="chevron-forward" size={18} color={C.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.toggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, viewMode === "week" && styles.toggleBtnActive]}
                onPress={() => { setWeekStart(startOfWeek(monthStart, { weekStartsOn: 0 })); setViewMode("week"); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.toggleTxt, viewMode === "week" && styles.toggleTxtActive]}>Week</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, viewMode === "month" && styles.toggleBtnActive]}
                onPress={() => { setMonthStart(startOfMonth(weekStart)); setViewMode("month"); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.toggleTxt, viewMode === "month" && styles.toggleTxtActive]}>Month</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Centered date label ──────────────────────────────────── */}
          <Text style={styles.dateLabel}>{format(new Date(), "MMMM d, yyyy")}</Text>

          {viewMode === "week" ? (
            /* ── Week pill strip ──────────────────────────────────── */
            <View style={styles.pillRow}>
              {weekDays.map((day) => {
                const dayKey = format(day, "yyyy-MM-dd");
                const today  = isToday(day);
                const dayEvts = events.filter((e) => format(e.startTime.toDate(), "yyyy-MM-dd") === dayKey);
                return (
                  <View key={dayKey} style={[styles.pill, today && styles.pillToday]}>
                    <Text style={[styles.pillDayName, today && styles.pillDayNameToday]}>
                      {format(day, "EEE")}
                    </Text>
                    <Text style={[styles.pillDayNum, today && styles.pillDayNumToday]}>
                      {format(day, "d")}
                    </Text>
                    {today && (
                      <View style={styles.pillDots}>
                        {dayEvts.length > 0
                          ? dayEvts.slice(0, 3).map((e) => (
                              <View key={e.id} style={[styles.pillDot, { backgroundColor: 'rgba(255,255,255,0.6)' }]} />
                            ))
                          : [0,1,2].map((i) => <View key={i} style={styles.pillDot} />)
                        }
                      </View>
                    )}
                  </View>
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
                      const dayEvts  = inMonth
                        ? events.filter((e) => format(e.startTime.toDate(), "yyyy-MM-dd") === dayKey)
                        : [];
                      return (
                        <View key={dayKey} style={styles.dayCell}>
                          <View style={[styles.dayNumCircle, today && styles.dayNumCircleToday]}>
                            <Text style={[styles.dayNum, !inMonth && styles.dayNumFaint, today && styles.dayNumToday]}>
                              {format(day, "d")}
                            </Text>
                          </View>
                          <View style={styles.dotsRow}>
                            {dayEvts.slice(0, 3).map((e) => (
                              <View key={e.id} style={[styles.dot, { backgroundColor: e.color }]} />
                            ))}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ))
              )}
            </>
          )}

          {/* ── Section row: Add + Filter ────────────────────────────── */}
          <View style={styles.sectionRow}>
            <Text style={styles.addBtn}>Events</Text>

            <View ref={filterBtnRef} collapsable={false}>
              <TouchableOpacity style={styles.filterBtn} onPress={openFilter} activeOpacity={0.7}>
                <Ionicons name="options-outline" size={16} color={C.text} />
                <Text style={styles.filterBtnTxt}>
                  {filter === 'all' ? 'Filter' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Filtered list ────────────────────────────────────────── */}
          <View style={styles.listSection}>
            {isLoading ? (
              <ActivityIndicator style={styles.listLoader} color={C.text} />
            ) : filteredItems.length === 0 ? (
              <Text style={styles.empty}>Nothing to show</Text>
            ) : (
              filteredItems.map((item, i) =>
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
          <AddButtonSvg width={64} height={64} />
        </TouchableOpacity>

        <EventForm ref={formRef} onSubmit={addEvent} onUpdate={updateEvent} onDelete={deleteEvent} event={selectedEvent} />
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

  // Page title
  header: { paddingTop: 64, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: "700", fontFamily: "GowunBatang_700Bold", color: C.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: C.muted, marginTop: 4 },

  // Nav row
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  monthNav: { flexDirection: "row", alignItems: "center", gap: 8 },
  monthNavLabel: { fontSize: 16, fontWeight: "700", color: C.text },

  // Toggle
  toggle: {
    flexDirection: "row",
    backgroundColor: C.toggleBg,
    borderRadius: 20,
    padding: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  toggleBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 17 },
  toggleBtnActive: { backgroundColor: C.toggleActive },
  toggleTxt: { fontSize: 13, fontWeight: "600", color: C.toggleMutedTxt },
  toggleTxtActive: { color: C.toggleActiveTxt },

  // Date label
  dateLabel: { textAlign: "center", fontSize: 13, color: C.text, fontWeight: "500", marginBottom: 20 },

  // Week pill strip
  pillRow: { flexDirection: "row", alignItems: "flex-end", gap: 5, marginBottom: 28 },
  pill: { flex: 1, backgroundColor: C.pill, borderRadius: 28, paddingTop: 10, paddingBottom: 12, alignItems: "center", gap: 4 },
  pillToday: { backgroundColor: C.today, paddingTop: 14, paddingBottom: 14 },
  pillDayName: { fontSize: 10, fontWeight: "600", color: C.pillText, opacity: 0.85 },
  pillDayNameToday: { fontSize: 11, fontWeight: "700", opacity: 1 },
  pillDayNum: { fontSize: 15, fontWeight: "700", color: C.pillText },
  pillDayNumToday: { fontSize: 20, fontWeight: "800" },
  pillDots: { flexDirection: "row", gap: 3, marginTop: 2 },
  pillDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },

  // Month grid
  dowRow: { flexDirection: "row", marginBottom: 6 },
  dowLabel: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "600", color: C.muted, letterSpacing: 0.3 },
  dayRow: { flexDirection: "row" },
  dayCell: { flex: 1, alignItems: "center", paddingVertical: 5 },
  dayNumCircle: { width: 30, height: 30, borderRadius: 15, justifyContent: "center", alignItems: "center" },
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
    marginTop: 20,
    marginBottom: 14,
  },
  addBtn: { fontSize: 15, fontWeight: "700", color: C.text },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  filterBtnTxt: { fontSize: 13, fontWeight: "600", color: C.text },

  // Events list
  listSection: {},
  loader: { marginTop: 24 },
  listLoader: { marginTop: 48 },
  empty: { color: C.muted, marginTop: 32, textAlign: "center" },
  row: { marginBottom: 12 },

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
