import { useHouseStore } from '@/src/store/houseStore';
import { CHORE_THEME } from '@/src/theme/chores';
import type { Chore, CustomIntervalUnit, CustomRecurrence } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import {
    BottomSheetBackdrop,
    BottomSheetBackdropProps,
    BottomSheetModal,
    BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { AssignmentTile } from './AssignmentTile';
import { MonthDayPicker } from './MonthDayPicker';
import { RecurrenceDropdown } from './RecurrenceDropdown';

export type ChoreFormPayload = Pick<Chore, 'title' | 'recurrence'> & {
  assignedTo?: string;
  autoRotate?: boolean;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  customRecurrence?: CustomRecurrence | null;
  dueAt?: Timestamp | null;
};

interface ChoreFormProps {
  onSubmit: (input: ChoreFormPayload) => Promise<void>;
}

// User-facing recurrence options. Order matches the spec; every-N-weeks
// cadences (including the legacy biweekly) live under 'Custom'.
const RECURRENCES: { label: string; value: Chore['recurrence'] }[] = [
  { label: 'Does not repeat', value: 'once' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Custom', value: 'custom' },
];

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const initialOf = (name: string) => name?.trim()?.[0]?.toUpperCase() ?? '?';

export const ChoreForm = forwardRef<BottomSheetModal, ChoreFormProps>(
  ({ onSubmit }, ref) => {
    const memberMap = useHouseStore((s) => s.memberMap);
    const house = useHouseStore((s) => s.house);
    const memberIds = Object.keys(memberMap);

    // Auto-rotate is available for every recurring shape (anything but 'once').
    // It defaults ON when the house-wide master switch is enabled.
    const masterAutoRotate = house?.weeklyScrambleEnabled !== false;

    const [title, setTitle] = useState('');
    const [assignedTo, setAssignedTo] = useState(memberIds[0] ?? '');
    const [recurrence, setRecurrence] = useState<Chore['recurrence']>('once');
    const [autoRotate, setAutoRotate] = useState(masterAutoRotate);
    const [dayOfWeek, setDayOfWeek] = useState(0);
    const [dayOfMonth, setDayOfMonth] = useState<number>(1);
    const [customCount, setCustomCount] = useState<number>(1);
    const [customUnit, setCustomUnit] = useState<CustomIntervalUnit>('weeks');
    const [customDays, setCustomDays] = useState<number[]>([new Date().getDay()]);
    const [dueDate, setDueDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [submitting, setSubmitting] = useState(false);


    // `assignedTo` is seeded from `memberIds[0]` at mount. If the house store
    // hadn't hydrated yet (rare but possible right after login), `memberIds`
    // would be empty and the field would stay `''` even after members load,
    // leaving the user stuck on the "Pick a member" submit-gate alert until
    // they manually tapped an avatar. Backfill the default once members
    // become available — only when the field is still empty, so we never
    // clobber an explicit user choice.
    const memberIdsKey = memberIds.join('|');
    useEffect(() => {
      if (!assignedTo && memberIds.length > 0) {
        setAssignedTo(memberIds[0]);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [memberIdsKey]);

    // Single fixed snap point so the sheet never resizes when fields change.
    const snapPoints = useMemo(() => ['90%'], []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      ),
      []
    );

    const showWeeklyDayPicker = recurrence === 'weekly';
    const showMonthlyDayPicker = recurrence === 'monthly';
    const showCustomBlock = recurrence === 'custom';
    const showDueDatePicker = recurrence === 'once';
    const supportsAutoRotate = recurrence !== 'once';
    const requiresMemberPick = !supportsAutoRotate || !autoRotate;

    const toggleCustomDay = (idx: number) => {
      setCustomDays((prev) =>
        prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx].sort()
      );
    };

    const resetState = () => {
      setTitle('');
      setRecurrence('once');
      setAutoRotate(masterAutoRotate);
      setDayOfWeek(0);
      setDayOfMonth(1);
      setCustomCount(1);
      setCustomUnit('weeks');
      setCustomDays([new Date().getDay()]);
      setDueDate(null);
    };

    const handleAddToCalendar = () => {
      Alert.alert('Coming soon', 'Calendar sync will be available in a future update.');
    };

    const handleSubmit = async () => {
      if (!title.trim()) return;
      if (memberIds.length === 0) {
        Alert.alert('No members', 'Join a house before adding chores.');
        return;
      }
      if (requiresMemberPick && !assignedTo) {
        Alert.alert('Pick a member', 'Choose who this chore goes to, or enable auto-rotate.');
        return;
      }
      if (recurrence === 'custom') {
        if (customCount < 1) {
          Alert.alert('Invalid interval', 'Repeat-every count must be at least 1.');
          return;
        }
        if (customUnit === 'weeks' && customDays.length === 0) {
          Alert.alert('Pick a day', 'Choose at least one day of the week to repeat on.');
          return;
        }
      }

      // Build the recurrence-specific payload pieces.
      const payload: ChoreFormPayload = {
        title: title.trim(),
        recurrence,
        autoRotate: supportsAutoRotate ? autoRotate : false,
        // When auto-rotate is on, leave assignedTo empty so useChores seeds it
        // deterministically using house.rotationOffset.
        assignedTo: requiresMemberPick ? assignedTo : undefined,
        dayOfWeek: recurrence === 'weekly' ? dayOfWeek : null,
        dayOfMonth: recurrence === 'monthly' ? dayOfMonth : null,
        customRecurrence:
          recurrence === 'custom'
            ? {
                count: customCount,
                unit: customUnit,
                ...(customUnit === 'weeks' ? { daysOfWeek: customDays } : {}),
              }
            : null,
        dueAt: recurrence === 'once' && dueDate ? Timestamp.fromDate(dueDate) : null,
      };

      setSubmitting(true);
      try {
        await onSubmit(payload);
        resetState();
        (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
      } catch (err: any) {
        Alert.alert('Could not add chore', err.message ?? 'Unknown error');
      } finally {
        setSubmitting(false);
      }
    };

    const handleClose = () => {
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
    };

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
        keyboardBehavior="interactive"
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.heading}>New Chore</Text>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={24} color={CHORE_THEME.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerDivider} />

          {/* Chore Name */}
          <Text style={styles.label}>Chore Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Vacuum living room"
            placeholderTextColor={CHORE_THEME.textMuted}
            value={title}
            onChangeText={setTitle}
          />

          {/* Recurrence */}
          <Text style={styles.label}>Recurrence</Text>
          <RecurrenceDropdown
            value={recurrence}
            options={RECURRENCES}
            onChange={(v) => setRecurrence(v)}
          />

          {showWeeklyDayPicker && (
            <>
              <Text style={styles.label}>Recurrence Settings</Text>
              <View style={styles.settingsCard}>
                <Text style={styles.subLabel}>Repeat on</Text>
                <View style={styles.chipRow}>
                  {DAYS.map((day, idx) => {
                    const active = dayOfWeek === idx;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.dayChip, active && styles.dayChipActive]}
                        onPress={() => setDayOfWeek(idx)}
                      >
                        <Text
                          style={[styles.dayChipText, active && styles.dayChipTextActive]}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </>
          )}

          {showMonthlyDayPicker && (
            <>
              <Text style={styles.label}>Day of Month</Text>
              <MonthDayPicker value={dayOfMonth} onChange={setDayOfMonth} />
            </>
          )}

          {showCustomBlock && (
            <>
              <Text style={styles.label}>Repeat every</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => setCustomCount((n) => Math.max(1, n - 1))}
                  accessibilityLabel="Decrease interval"
                >
                  <Text style={styles.stepperButtonText}>–</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{customCount}</Text>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => setCustomCount((n) => n + 1)}
                  accessibilityLabel="Increase interval"
                >
                  <Text style={styles.stepperButtonText}>+</Text>
                </TouchableOpacity>
                <View style={styles.unitGroup}>
                  {(['days', 'weeks'] as CustomIntervalUnit[]).map((u) => {
                    const active = customUnit === u;
                    const label = customCount === 1 ? u.slice(0, -1) : u;
                    return (
                      <TouchableOpacity
                        key={u}
                        style={[styles.unitChip, active && styles.unitChipActive]}
                        onPress={() => setCustomUnit(u)}
                      >
                        <Text
                          style={[styles.unitChipText, active && styles.unitChipTextActive]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {customUnit === 'weeks' && (
                <>
                  <Text style={styles.label}>Repeat on</Text>
                  <View style={styles.chipRow}>
                    {DAYS.map((day, idx) => {
                      const active = customDays.includes(idx);
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[styles.dayChip, active && styles.dayChipActive]}
                          onPress={() => toggleCustomDay(idx)}
                        >
                          <Text
                            style={[styles.dayChipText, active && styles.dayChipTextActive]}
                          >
                            {day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </>
          )}

          {showDueDatePicker && (
            <>
              <Text style={styles.label}>Due Date (Optional)</Text>
              <TouchableOpacity
                style={styles.datePill}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="calendar-outline" size={15} color={CHORE_THEME.text} />
                <Text style={styles.datePillText}>
                  {dueDate ? format(dueDate, 'EEEE, MMM. d') : 'Select a date'}
                </Text>
                {dueDate && (
                  <TouchableOpacity onPress={() => setDueDate(null)} hitSlop={8} style={{ marginLeft: 'auto' }}>
                    <Ionicons name="close-circle" size={16} color={CHORE_THEME.textMuted} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              <Modal visible={showDatePicker} transparent animationType="fade">
                <Pressable style={styles.calOverlay} onPress={() => setShowDatePicker(false)}>
                  <Pressable style={styles.calCard} onPress={(e) => e.stopPropagation()}>
                    <Calendar
                      current={dueDate ? format(dueDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
                      markedDates={dueDate ? { [format(dueDate, 'yyyy-MM-dd')]: { selected: true, selectedColor: CHORE_THEME.accent } } : {}}
                      onDayPress={(day: { dateString: string }) => {
                        const [y, m, d] = day.dateString.split('-').map(Number);
                        setDueDate(new Date(y, m - 1, d));
                        setShowDatePicker(false);
                      }}
                      theme={{
                        backgroundColor: '#FDFAF7',
                        calendarBackground: '#FDFAF7',
                        todayTextColor: CHORE_THEME.accent,
                        selectedDayBackgroundColor: CHORE_THEME.accent,
                        selectedDayTextColor: '#fff',
                        arrowColor: CHORE_THEME.text,
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
            </>
          )}

          {/* Assignment */}
          <Text style={styles.label}>Assignment</Text>
          <View style={styles.assignmentRow}>
            {memberIds.map((uid) => {
              const m = memberMap[uid];
              const active = !autoRotate && assignedTo === uid;
              return (
                <AssignmentTile
                  key={uid}
                  label={m.displayName}
                  initial={initialOf(m.displayName)}
                  color={m.color}
                  selected={active}
                  onPress={() => {
                    setAutoRotate(false);
                    setAssignedTo(uid);
                  }}
                />
              );
            })}
            {supportsAutoRotate && (
              <AssignmentTile
                label="Auto Rotate"
                iconName="sync-circle-outline"
                selected={autoRotate}
                onPress={() => setAutoRotate(true)}
              />
            )}
          </View>

          {/* Footer actions */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.outlineButton}
              onPress={handleAddToCalendar}
              activeOpacity={0.7}
            >
              <Text style={styles.outlineButtonText}>+ Add to calendar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>{submitting ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);

ChoreForm.displayName = 'ChoreForm';

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: CHORE_THEME.bg,
  },
  handle: {
    backgroundColor: CHORE_THEME.hairline,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    fontFamily: 'GowunBatang_700Bold',
    fontSize: 22,
    color: CHORE_THEME.text,
  },
  headerDivider: {
    height: 1,
    backgroundColor: CHORE_THEME.hairline,
    marginTop: 10,
    marginBottom: 4,
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
  subLabel: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 12,
    color: CHORE_THEME.textMuted,
    marginBottom: 8,
  },
  input: {
    fontFamily: 'AlbertSans_400Regular',
    borderWidth: 1,
    borderColor: CHORE_THEME.hairline,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: CHORE_THEME.text,
    backgroundColor: CHORE_THEME.cardBg,
  },
  settingsCard: {
    backgroundColor: CHORE_THEME.cardBg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: CHORE_THEME.hairline,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CHORE_THEME.cardBg,
    borderWidth: 1,
    borderColor: CHORE_THEME.hairline,
  },
  dayChipActive: {
    backgroundColor: CHORE_THEME.accent,
    borderColor: CHORE_THEME.accent,
  },
  dayChipText: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 13,
    color: CHORE_THEME.text,
  },
  dayChipTextActive: {
    color: CHORE_THEME.onAccent,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CHORE_THEME.hairline,
    backgroundColor: CHORE_THEME.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    fontFamily: 'AlbertSans_700Bold',
    fontSize: 20,
    color: CHORE_THEME.text,
    lineHeight: 22,
  },
  stepperValue: {
    fontFamily: 'AlbertSans_700Bold',
    minWidth: 36,
    textAlign: 'center',
    fontSize: 18,
    color: CHORE_THEME.text,
  },
  unitGroup: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
  },
  unitChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CHORE_THEME.hairline,
    backgroundColor: CHORE_THEME.cardBg,
  },
  unitChipActive: {
    backgroundColor: CHORE_THEME.accent,
    borderColor: CHORE_THEME.accent,
  },
  unitChipText: {
    fontFamily: 'AlbertSans_500Medium',
    fontSize: 14,
    color: CHORE_THEME.text,
  },
  unitChipTextActive: {
    fontFamily: 'AlbertSans_700Bold',
    color: CHORE_THEME.onAccent,
  },
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
  datePillText: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 14,
    color: CHORE_THEME.text,
    flex: 1,
  },
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
  assignmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
  },
  outlineButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: CHORE_THEME.hairline,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: CHORE_THEME.cardBg,
  },
  outlineButtonText: {
    fontFamily: 'AlbertSans_600SemiBold',
    color: CHORE_THEME.text,
    fontSize: 14,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: CHORE_THEME.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontFamily: 'AlbertSans_700Bold',
    color: CHORE_THEME.onAccent,
    fontSize: 15,
  },
});
