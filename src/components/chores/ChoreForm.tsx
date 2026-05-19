import { useHouseStore } from '@/src/store/houseStore';
import type { Chore, CustomIntervalUnit, CustomRecurrence } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import {
    BottomSheetBackdrop,
    BottomSheetBackdropProps,
    BottomSheetModal,
    BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AssignmentTile } from './AssignmentTile';
import { MonthDayPicker } from './MonthDayPicker';
import { RecurrenceDropdown } from './RecurrenceDropdown';

// Peach palette mirrors app/(tabs)/chores.tsx (CH constants).
const CH = {
  peachBg: '#FFF0E2',
  plateBg: '#FFE2CB',
  plateBorder: '#F4BA93',
  textStrong: '#5A2F1A',
  textSoft: '#946345',
  fill: '#D97745',
  white: '#FFFFFF',
};

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

type EditableRecurrence = Exclude<Chore['recurrence'], 'biweekly'>;

// User-facing recurrence options. Order matches the spec; 'biweekly' is
// intentionally absent — it now lives under 'Custom' (every 2 weeks).
const RECURRENCES: { label: string; value: EditableRecurrence }[] = [
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

    // Auto-rotate is only available for recurring (non-once, non-daily) chores.
    // It defaults ON when the house-wide master switch is enabled.
    const masterAutoRotate = house?.weeklyScrambleEnabled !== false;

    const [title, setTitle] = useState('');
    const [assignedTo, setAssignedTo] = useState(memberIds[0] ?? '');
    const [recurrence, setRecurrence] = useState<EditableRecurrence>('once');
    const [autoRotate, setAutoRotate] = useState(masterAutoRotate);
    const [dayOfWeek, setDayOfWeek] = useState(0);
    const [dayOfMonth, setDayOfMonth] = useState<number>(1);
    const [customCount, setCustomCount] = useState<number>(1);
    const [customUnit, setCustomUnit] = useState<CustomIntervalUnit>('weeks');
    const [customDays, setCustomDays] = useState<number[]>([new Date().getDay()]);
    const [dueDate, setDueDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const webDateInputRef = React.useRef<HTMLInputElement>(null);

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
    const supportsAutoRotate =
      recurrence === 'weekly' || recurrence === 'monthly' || recurrence === 'custom';
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
              <Ionicons name="close" size={24} color={CH.textStrong} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerDivider} />

          {/* Chore Name */}
          <Text style={styles.label}>Chore Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Vacuum living room"
            placeholderTextColor={CH.textSoft}
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

              {Platform.OS === 'web' ? (
                <View style={styles.datePickerContainer}>
                  <View style={styles.dateButton}>
                    <div
                      onClick={() => webDateInputRef.current?.showPicker?.()}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        cursor: 'pointer',
                        zIndex: 1,
                      }}
                    />
                    <input
                      ref={webDateInputRef}
                      type="date"
                      value={dueDate ? format(dueDate, 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          const [year, month, day] = e.target.value.split('-').map(Number);
                          setDueDate(new Date(year, month - 1, day));
                        } else {
                          setDueDate(null);
                        }
                      }}
                      onFocus={() => {
                        setTimeout(() => {
                          webDateInputRef.current?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                          });
                        }, 100);
                      }}
                      style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        fontSize: 16,
                        color: CH.textStrong,
                        outline: 'none',
                        padding: 0,
                        position: 'relative',
                        zIndex: 0,
                      }}
                    />
                  </View>
                  {dueDate && (
                    <TouchableOpacity
                      style={styles.clearButton}
                      onPress={() => setDueDate(null)}
                    >
                      <Text style={styles.clearButtonText}>Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <>
                  <View style={styles.datePickerContainer}>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={styles.dateButtonText}>
                        {dueDate ? dueDate.toLocaleDateString() : 'Select date'}
                      </Text>
                    </TouchableOpacity>
                    {dueDate && (
                      <TouchableOpacity
                        style={styles.clearButton}
                        onPress={() => setDueDate(null)}
                      >
                        <Text style={styles.clearButtonText}>Clear</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {showDatePicker && (
                    <DateTimePicker
                      value={dueDate || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) {
                          setDueDate(selectedDate);
                        }
                      }}
                    />
                  )}
                </>
              )}
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
    backgroundColor: CH.peachBg,
  },
  handle: {
    backgroundColor: CH.plateBorder,
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
    fontSize: 22,
    fontWeight: '800',
    color: CH.textStrong,
  },
  headerDivider: {
    height: 1,
    backgroundColor: CH.plateBorder,
    marginTop: 10,
    marginBottom: 4,
    opacity: 0.6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: CH.textSoft,
    marginBottom: 8,
    marginTop: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: CH.textSoft,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: CH.plateBorder,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: CH.textStrong,
    backgroundColor: CH.white,
  },
  settingsCard: {
    backgroundColor: CH.plateBg,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: CH.plateBorder,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CH.white,
    borderWidth: 1,
    borderColor: CH.plateBorder,
  },
  dayChipActive: {
    backgroundColor: CH.fill,
    borderColor: CH.fill,
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: CH.textStrong,
  },
  dayChipTextActive: {
    color: CH.white,
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
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: CH.plateBorder,
    backgroundColor: CH.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: CH.textStrong,
    lineHeight: 22,
  },
  stepperValue: {
    minWidth: 36,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: CH.textStrong,
  },
  unitGroup: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
  },
  unitChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: CH.plateBorder,
    backgroundColor: CH.white,
  },
  unitChipActive: {
    backgroundColor: CH.fill,
    borderColor: CH.fill,
  },
  unitChipText: {
    fontSize: 14,
    color: CH.textStrong,
    fontWeight: '500',
  },
  unitChipTextActive: {
    color: CH.white,
    fontWeight: '700',
  },
  datePickerContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dateButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: CH.plateBorder,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: CH.white,
  },
  dateButtonText: {
    fontSize: 16,
    color: CH.textStrong,
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: CH.fill,
    backgroundColor: CH.plateBg,
  },
  clearButtonText: {
    fontSize: 14,
    color: CH.fill,
    fontWeight: '600',
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
    borderWidth: 1.5,
    borderColor: CH.plateBorder,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: CH.white,
  },
  outlineButtonText: {
    color: CH.textStrong,
    fontWeight: '600',
    fontSize: 14,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: CH.fill,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: CH.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
