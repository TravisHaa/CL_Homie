import { forwardRef, useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { format, addHours } from 'date-fns';
import type { NewEventInput } from '@/src/hooks/useCalendarEvents';
import type { CalendarEvent } from '@/src/types';
import { useHouseStore } from '@/src/store/houseStore';
import PartyIcon from '@/assets/images/party-icon.svg';
import { AssignmentTile } from '@/src/components/chores/AssignmentTile';
import { RecurrenceDropdown } from '@/src/components/chores/RecurrenceDropdown';
import { CHORE_THEME } from '@/src/theme/chores';

// ── Scroll picker constants ───────────────────────────────────────────
const ITEM_H  = 44;
const VISIBLE = 5;
const HOURS   = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
const AMPM    = ['AM', 'PM'];

function PickerCol({ data, selectedIndex, onChange, width = 56 }: {
  data: string[]; selectedIndex: number; onChange: (i: number) => void; width?: number;
}) {
  const ref = useRef<ScrollView>(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false }), 80);
    return () => clearTimeout(t);
  }, []);
  const snapTo = (y: number) => {
    const idx = Math.max(0, Math.min(Math.round(y / ITEM_H), data.length - 1));
    ref.current?.scrollTo({ y: idx * ITEM_H, animated: true });
    onChange(idx);
  };
  return (
    <ScrollView
      ref={ref}
      style={{ height: ITEM_H * VISIBLE, width, backgroundColor: 'transparent' }}
      snapToInterval={ITEM_H}
      decelerationRate="fast"
      showsVerticalScrollIndicator={false}
      onMomentumScrollEnd={(e) => snapTo(e.nativeEvent.contentOffset.y)}
      onScrollEndDrag={(e) => snapTo(e.nativeEvent.contentOffset.y)}
      contentContainerStyle={{ paddingVertical: ITEM_H * 2 }}
    >
      {data.map((label, i) => (
        <TouchableOpacity
          key={i}
          style={{ height: ITEM_H, justifyContent: 'center', alignItems: 'center' }}
          onPress={() => { ref.current?.scrollTo({ y: i * ITEM_H, animated: true }); onChange(i); }}
          activeOpacity={0.6}
        >
          <Text style={{ fontSize: 15, fontWeight: i === selectedIndex ? '700' : '400', color: i === selectedIndex ? '#2E0800' : '#C8BFB0' }}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function TimePickerRow({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const h24 = value.getHours(), min = value.getMinutes();
  const isAM = h24 < 12, h12 = h24 % 12 || 12, miIdx = Math.min(Math.round(min / 5), 11);

  const apply = (patch: { h12?: number; miIdx?: number; isAM?: boolean }) => {
    const hour = patch.h12 ?? h12, am = patch.isAM ?? isAM, mi = patch.miIdx ?? miIdx;
    const h = am ? (hour === 12 ? 0 : hour) : (hour === 12 ? 12 : hour + 12);
    const next = new Date(value);
    next.setHours(h, mi * 5, 0, 0);
    onChange(next);
  };

  return (
    <View style={pickerStyles.wrap}>
      <View style={pickerStyles.highlight} pointerEvents="none" />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        <PickerCol data={HOURS} selectedIndex={h12 - 1} onChange={(i) => apply({ h12: i + 1 })} width={36} />
        <Text style={pickerStyles.colon}>:</Text>
        <PickerCol data={MINUTES} selectedIndex={miIdx} onChange={(i) => apply({ miIdx: i })} width={40} />
        <PickerCol data={AMPM} selectedIndex={isAM ? 0 : 1} onChange={(i) => apply({ isAM: i === 0 })} width={44} />
      </View>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  wrap: { backgroundColor: CHORE_THEME.cardBg, borderWidth: 1, borderColor: CHORE_THEME.hairline, borderRadius: 14, overflow: 'hidden' },
  highlight: { position: 'absolute', top: ITEM_H * 2, left: 0, right: 0, height: ITEM_H, backgroundColor: 'rgba(78, 123, 120, 0.1)', borderTopWidth: 1, borderBottomWidth: 1, borderColor: CHORE_THEME.hairline },
  sep: { width: 1, height: ITEM_H * VISIBLE, backgroundColor: CHORE_THEME.hairline, marginHorizontal: 6, alignSelf: 'stretch' },
  colon: { fontFamily: 'AlbertSans_700Bold', fontSize: 17, color: CHORE_THEME.text, paddingHorizontal: 2 },
});

// ── Recurrence ────────────────────────────────────────────────────────

type RecurrenceOption = 'none' | 'daily' | 'weekly' | 'monthly';

const RECURRENCE_OPTIONS: { label: string; value: RecurrenceOption }[] = [
  { label: 'Does not repeat', value: 'none' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

// ── EventForm ─────────────────────────────────────────────────────────

interface Props {
  onSubmit: (input: NewEventInput) => Promise<void>;
  onUpdate?: (id: string, updates: NewEventInput) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  event?: CalendarEvent | null;
}

export const EventForm = forwardRef<BottomSheetModal, Props>(
  ({ onSubmit, onUpdate, onDelete, event }, ref) => {
    const [title, setTitle]             = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate]     = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [assignedTo, setAssignedTo]         = useState<string[]>([]);
    const [recurrence, setRecurrence]         = useState<RecurrenceOption>('none');
    const [error, setError]                   = useState('');
    const [submitting, setSubmitting]         = useState(false);

    const memberMap = useHouseStore((s) => s.memberMap);

    useEffect(() => {
      if (event) {
        setTitle(event.title);
        setDescription(event.description ?? '');
        setStartDate(event.startTime.toDate());
        setAssignedTo(event.assignedTo ?? []);
        setError('');
      } else {
        reset();
      }
    }, [event]);

    const reset = () => {
      setTitle(''); setDescription('');
      setStartDate(new Date()); setShowDatePicker(false);
      setAssignedTo([]); setRecurrence('none'); setError('');
    };

    const dismiss = () => (ref as React.RefObject<BottomSheetModal>).current?.dismiss();

    const toggleAssignee = (uid: string) =>
      setAssignedTo((prev) => prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]);

    const handleSubmit = async () => {
      setError('');
      if (!title.trim()) { setError('Event name is required'); return; }
      const endDate = addHours(startDate, 1);
      const payload: NewEventInput = {
        title: title.trim(),
        description: description.trim(),
        startTime: startDate,
        endTime: endDate,
        assignedTo,
      };
      setSubmitting(true);
      try {
        if (event && onUpdate) await onUpdate(event.id, payload);
        else await onSubmit(payload);
        reset();
        dismiss();
      } catch (err: any) {
        Alert.alert(event ? 'Could not update event' : 'Could not add event', err?.message ?? 'Unknown error');
      } finally {
        setSubmitting(false);
      }
    };

    const handleDelete = () => {
      if (!event || !onDelete) return;
      Alert.alert('Delete event?', `"${event.title}" will be removed for everyone.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await onDelete(event.id);
              reset();
              dismiss();
            } catch (err: any) {
              Alert.alert('Could not delete event', err?.message ?? 'Unknown error');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]);
    };

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      ), []
    );

    const memberIds = Object.keys(memberMap);

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['90%']}
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        onDismiss={reset}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
      >
        <BottomSheetScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerRow}>
<<<<<<< HEAD
            <Text style={styles.heading}>
              🎉  {event ? 'Edit Event' : 'New Event'}
            </Text>
            <View style={styles.headerActions}>
              {event && onDelete && (
                <TouchableOpacity onPress={handleDelete} hitSlop={12} activeOpacity={0.7}>
                  <Ionicons name="trash-outline" size={20} color="#3B1F0E" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={dismiss} hitSlop={12} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color="#3B1F0E" />
              </TouchableOpacity>
            </View>
=======
            <View style={styles.headingRow}>
              <PartyIcon width={24} height={24} />
              <Text style={styles.heading}>{event ? 'Edit Event' : 'New Event'}</Text>
            </View>
            <TouchableOpacity onPress={dismiss} hitSlop={12} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#3B1F0E" />
            </TouchableOpacity>
>>>>>>> origin/ui_changes
          </View>
          <View style={styles.headerDivider} />

          {/* Event Name */}
          <Text style={styles.label}>Event Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. House warming party"
            placeholderTextColor={CHORE_THEME.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          {/* Event Date */}
          <Text style={styles.label}>Event Date</Text>
          <TouchableOpacity
            style={styles.datePill}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.75}
          >
            <Ionicons name="calendar-outline" size={17} color={CHORE_THEME.text} />
            <Text style={styles.datePillTxt}>{format(startDate, "EEEE, MMM. d")}</Text>
          </TouchableOpacity>

          {/* Time picker (always visible) */}
          <Text style={styles.label}>Event Time</Text>
          <TimePickerRow value={startDate} onChange={setStartDate} />

          {/* Calendar modal */}
          <Modal visible={showDatePicker} transparent animationType="fade">
            <Pressable style={styles.calOverlay} onPress={() => setShowDatePicker(false)}>
              <Pressable style={styles.calCard} onPress={(e) => e.stopPropagation()}>
                <Calendar
                  current={format(startDate, 'yyyy-MM-dd')}
                  markedDates={{ [format(startDate, 'yyyy-MM-dd')]: { selected: true, selectedColor: '#4E7B78' } }}
                  onDayPress={(day: { dateString: string }) => {
                    const [y, m, d] = day.dateString.split('-').map(Number);
                    const next = new Date(startDate);
                    next.setFullYear(y, m - 1, d);
                    setStartDate(next);
                    setShowDatePicker(false);
                  }}
                  theme={{
                    backgroundColor: '#FDFAF7',
                    calendarBackground: '#FDFAF7',
                    todayTextColor: '#4E7B78',
                    selectedDayBackgroundColor: '#4E7B78',
                    selectedDayTextColor: '#fff',
                    arrowColor: '#2D1A0E',
                    textDayFontFamily: 'AlbertSans_400Regular',
                    textMonthFontFamily: 'AlbertSans_700Bold',
                    textDayHeaderFontFamily: 'AlbertSans_600SemiBold',
                    textDayFontSize: 14,
                    textMonthFontSize: 16,
                    textDayHeaderFontSize: 12,
                  }}
                />
              </Pressable>
            </Pressable>
          </Modal>

          {/* Recurrence */}
          <Text style={styles.label}>Recurrence</Text>
          <RecurrenceDropdown
            value={recurrence}
            options={RECURRENCE_OPTIONS}
            onChange={setRecurrence}
          />

          {/* Assign To */}
          {memberIds.length > 0 && (
            <>
              <Text style={styles.label}>Assignment</Text>
              <View style={styles.assignmentRow}>
                {memberIds.map((uid) => {
                  const member = memberMap[uid];
                  const selected = assignedTo.includes(uid);
                  return (
                    <AssignmentTile
                      key={uid}
                      label={member.displayName}
                      initial={member.displayName.trim().charAt(0).toUpperCase() || '?'}
                      color={member.color}
                      selected={selected}
                      onPress={() => toggleAssignee(uid)}
                    />
                  );
                })}
              </View>
            </>
          )}

          {/* Description */}
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Add event details"
            placeholderTextColor={CHORE_THEME.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {!!error && <Text style={styles.error}>{error}</Text>}
        </BottomSheetScrollView>

        {/* Save action stays reachable while the form body scrolls. */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              {submitting ? 'Saving…' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheetModal>
    );
  }
);

EventForm.displayName = 'EventForm';

const styles = StyleSheet.create({
  sheetBackground: { backgroundColor: CHORE_THEME.bg },
  handle: { backgroundColor: CHORE_THEME.hairline },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
<<<<<<< HEAD
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heading: { fontSize: 22, fontWeight: '700', color: '#3B1F0E' },

  // Dotted divider
  dottedDivider: { height: 1, borderTopWidth: 1, borderStyle: 'dashed', borderColor: '#C4B5E0', marginHorizontal: 0 },
=======
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heading: { fontFamily: 'GowunBatang_700Bold', fontSize: 22, color: CHORE_THEME.text },
  headerDivider: { height: 1, backgroundColor: CHORE_THEME.hairline, marginTop: 10, marginBottom: 4 },
>>>>>>> origin/ui_changes

  // Form
  scrollView: { flex: 1 },
  container: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 },
  footer: {
    backgroundColor: CHORE_THEME.bg,
    borderTopWidth: 1,
    borderTopColor: CHORE_THEME.hairline,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
  },
  label: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 12,
    color: CHORE_THEME.textMuted,
    marginBottom: 8,
    marginTop: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Text inputs
  input: {
    fontFamily: 'AlbertSans_400Regular',
    borderWidth: 1,
    borderColor: CHORE_THEME.hairline,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: CHORE_THEME.text,
    backgroundColor: CHORE_THEME.cardBg,
  },
  multiline: { height: 100 },

  // Date pill
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: CHORE_THEME.hairline,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: CHORE_THEME.cardBg,
  },
  datePillTxt: { flex: 1, fontFamily: 'AlbertSans_400Regular', fontSize: 14, color: CHORE_THEME.text },

  // Assignment
  assignmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  // Error
  error: { fontFamily: 'AlbertSans_500Medium', color: CHORE_THEME.danger, fontSize: 13, marginTop: 12 },

  // Calendar modal
  calOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  calCard: {
    backgroundColor: '#FDFAF7',
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 360,
  },

  // Save button
  primaryButton: {
    backgroundColor: CHORE_THEME.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { fontFamily: 'AlbertSans_700Bold', color: CHORE_THEME.onAccent, fontSize: 15 },
});
