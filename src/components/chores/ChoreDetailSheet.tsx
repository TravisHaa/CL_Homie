import { useHouseStore } from '@/src/store/houseStore';
import type { Chore, CustomIntervalUnit, CustomRecurrence } from '@/src/types';
import { recurrenceLabel as formatRecurrenceLabel } from '@/src/utils/choreSchedule';
import { Ionicons } from '@expo/vector-icons';
import {
    BottomSheetBackdrop,
    BottomSheetBackdropProps,
    BottomSheetModal,
    BottomSheetScrollView,
    BottomSheetView,
} from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
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
  danger: '#C0392B',
  dangerBg: '#FBE9E7',
};

type EditableRecurrence = Exclude<Chore['recurrence'], 'biweekly'>;

const RECURRENCES: { label: string; value: EditableRecurrence }[] = [
  { label: 'Does not repeat', value: 'once' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Custom', value: 'custom' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Coerces the (possibly legacy 'biweekly') stored value to an editable form.
function toEditable(r: Chore['recurrence']): EditableRecurrence {
  return r === 'biweekly' ? 'custom' : r;
}

type ChoreUpdatePatch = Partial<
  Pick<
    Chore,
    | 'title'
    | 'assignedTo'
    | 'dueAt'
    | 'recurrence'
    | 'dayOfWeek'
    | 'dayOfMonth'
    | 'customRecurrence'
    | 'autoRotate'
  >
>;

interface ChoreDetailSheetProps {
  chore: Chore | null;
  onUpdate: (
    choreId: string,
    patch: ChoreUpdatePatch,
    opts?: { recurrence?: Chore['recurrence'] }
  ) => Promise<void>;
  onDelete: (choreId: string) => Promise<void>;
}

export const ChoreDetailSheet = forwardRef<BottomSheetModal, ChoreDetailSheetProps>(
  ({ chore, onUpdate, onDelete }, ref) => {
    const memberMap = useHouseStore((s) => s.memberMap);
    const memberIds = Object.keys(memberMap);

    const house = useHouseStore((s) => s.house);
    const masterAutoRotate = house?.weeklyScrambleEnabled !== false;

    const [title, setTitle] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [recurrence, setRecurrence] = useState<EditableRecurrence>('once');
    const [autoRotate, setAutoRotate] = useState(false);
    const [dayOfWeek, setDayOfWeek] = useState<number>(0);
    const [dayOfMonth, setDayOfMonth] = useState<number>(1);
    const [customCount, setCustomCount] = useState<number>(1);
    const [customUnit, setCustomUnit] = useState<CustomIntervalUnit>('weeks');
    const [customDays, setCustomDays] = useState<number[]>([]);
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

    // Reset form whenever a different chore is opened.
    useEffect(() => {
      if (!chore) return;
      const editable = toEditable(chore.recurrence);
      setTitle(chore.title);
      setAssignedTo(chore.assignedTo);
      setRecurrence(editable);
      setAutoRotate(!!chore.autoRotate);
      setDayOfWeek(chore.dayOfWeek ?? 0);
      setDayOfMonth(chore.dayOfMonth ?? 1);
      // Seed custom controls from the stored shape, or sensible defaults when
      // switching INTO custom from a different recurrence in the editor.
      const cr = chore.customRecurrence ?? null;
      setCustomCount(cr?.count ?? (chore.recurrence === 'biweekly' ? 2 : 1));
      setCustomUnit(cr?.unit ?? 'weeks');
      setCustomDays(
        cr?.daysOfWeek ??
          (chore.dayOfWeek != null ? [chore.dayOfWeek] : [new Date().getDay()])
      );
      setDueDate(chore.dueAt ? chore.dueAt.toDate() : null);
      setShowDatePicker(false);
      setSubmitting(false);
    }, [chore?.id]);

    if (!chore) {
      // Keep the modal mounted (so ref stays valid) but render nothing inside.
      return (
        <BottomSheetModal
          ref={ref}
          snapPoints={snapPoints}
          enableDynamicSizing={false}
          backdropComponent={renderBackdrop}
          backgroundStyle={styles.sheetBackground}
          handleIndicatorStyle={styles.handle}
        >
          <BottomSheetView style={styles.content}>
            <View />
          </BottomSheetView>
        </BottomSheetModal>
      );
    }

    const showDueDatePicker = recurrence === 'once';
    const showWeeklyDayPicker = recurrence === 'weekly';
    const showMonthlyDayPicker = recurrence === 'monthly';
    const showCustomBlock = recurrence === 'custom';
    const supportsAutoRotate =
      recurrence === 'weekly' || recurrence === 'monthly' || recurrence === 'custom';
    const requiresMemberPick = !supportsAutoRotate || !autoRotate;

    const toggleCustomDay = (idx: number) => {
      setCustomDays((prev) =>
        prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx].sort()
      );
    };

    // Compare the form's current custom shape vs the chore's stored one.
    const storedCustom = chore.customRecurrence ?? null;
    const customDirty =
      recurrence === 'custom' &&
      (storedCustom?.count !== customCount ||
        storedCustom?.unit !== customUnit ||
        JSON.stringify(storedCustom?.daysOfWeek ?? []) !==
          JSON.stringify(customUnit === 'weeks' ? customDays : []));

    const isDirty =
      title.trim() !== chore.title ||
      (requiresMemberPick && assignedTo !== chore.assignedTo) ||
      recurrence !== toEditable(chore.recurrence) ||
      (supportsAutoRotate && autoRotate !== !!chore.autoRotate) ||
      (showWeeklyDayPicker && dayOfWeek !== (chore.dayOfWeek ?? 0)) ||
      (showMonthlyDayPicker && dayOfMonth !== (chore.dayOfMonth ?? 1)) ||
      customDirty ||
      (showDueDatePicker && (dueDate?.getTime() ?? null) !== (chore.dueAt?.toDate().getTime() ?? null));

    const handleSave = async () => {
      if (!chore) return;
      const trimmed = title.trim();
      if (!trimmed) {
        Alert.alert('Title required', 'Please enter a chore name.');
        return;
      }

      // Validate custom shape before building the patch.
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

      const patch: ChoreUpdatePatch = {};
      if (trimmed !== chore.title) patch.title = trimmed;
      if (requiresMemberPick && assignedTo && assignedTo !== chore.assignedTo) {
        patch.assignedTo = assignedTo;
      }
      if (recurrence !== toEditable(chore.recurrence)) {
        patch.recurrence = recurrence;
      }
      if (supportsAutoRotate && autoRotate !== !!chore.autoRotate) {
        patch.autoRotate = autoRotate;
      }
      if (recurrence === 'weekly' && dayOfWeek !== (chore.dayOfWeek ?? 0)) {
        patch.dayOfWeek = dayOfWeek;
      }
      if (recurrence === 'monthly' && dayOfMonth !== (chore.dayOfMonth ?? 1)) {
        patch.dayOfMonth = dayOfMonth;
      }
      if (recurrence === 'custom' && (patch.recurrence || customDirty)) {
        const next: CustomRecurrence = {
          count: customCount,
          unit: customUnit,
          ...(customUnit === 'weeks' ? { daysOfWeek: customDays } : {}),
        };
        patch.customRecurrence = next;
      }
      if (showDueDatePicker) {
        const nextTs = dueDate ? Timestamp.fromDate(dueDate) : null;
        const prevMs = chore.dueAt?.toDate().getTime() ?? null;
        const nextMs = dueDate?.getTime() ?? null;
        if (prevMs !== nextMs) patch.dueAt = nextTs;
      }

      if (Object.keys(patch).length === 0) {
        (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
        return;
      }

      setSubmitting(true);
      try {
        await onUpdate(chore.id, patch, { recurrence: chore.recurrence });
        (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
      } catch (err: any) {
        Alert.alert('Could not update chore', err.message ?? 'Unknown error');
      } finally {
        setSubmitting(false);
      }
    };

    const handleDelete = () => {
      if (!chore) return;
      Alert.alert(
        'Delete chore?',
        `"${chore.title}" will be removed. This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setSubmitting(true);
              try {
                await onDelete(chore.id);
                (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
              } catch (err: any) {
                Alert.alert('Could not delete chore', err.message ?? 'Unknown error');
              } finally {
                setSubmitting(false);
              }
            },
          },
        ]
      );
    };

    const handleAddToCalendar = () => {
      Alert.alert('Coming soon', 'Calendar sync will be available in a future update.');
    };

    const handleClose = () => {
      (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
    };

    const initialOf = (name: string) => name?.trim()?.[0]?.toUpperCase() ?? '?';

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
            <Text style={styles.heading}>Edit Chore</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={CH.textStrong} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerDivider} />

          {/* Chore Name */}
          <Text style={styles.label}>Chore Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Clean the bathroom"
            placeholderTextColor={CH.textSoft}
            value={title}
            onChangeText={setTitle}
          />

          {/* Recurrence */}
          <Text style={styles.label}>Recurrence</Text>
          <Text style={styles.summary}>{formatRecurrenceLabel(chore)}</Text>
          <RecurrenceDropdown
            value={recurrence}
            options={RECURRENCES}
            onChange={(v) => setRecurrence(v)}
          />

          {showWeeklyDayPicker && (
            <>
              <Text style={styles.label}>Day of Week</Text>
              <View style={styles.chipRow}>
                {DAYS.map((day, idx) => {
                  const active = dayOfWeek === idx;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setDayOfWeek(idx)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{day}</Text>
                    </TouchableOpacity>
                  );
                })}
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
                >
                  <Text style={styles.stepperButtonText}>–</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{customCount}</Text>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => setCustomCount((n) => n + 1)}
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
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setCustomUnit(u)}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
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
                          style={[styles.chip, active && styles.chipActive]}
                          onPress={() => toggleCustomDay(idx)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>{day}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </>
          )}

          {/* Due Date — only for one-time chores */}
          {showDueDatePicker && (
            <>
              <Text style={styles.label}>Due Date</Text>
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
                    <TouchableOpacity style={styles.clearButton} onPress={() => setDueDate(null)}>
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
                      <TouchableOpacity style={styles.clearButton} onPress={() => setDueDate(null)}>
                        <Text style={styles.clearButtonText}>Clear</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {showDatePicker && (
                    <DateTimePicker
                      value={dueDate || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(_event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) setDueDate(selectedDate);
                      }}
                    />
                  )}
                </>
              )}
            </>
          )}

          {/* Assignment */}
          <Text style={styles.label}>Assignment</Text>
          <View style={styles.avatarRow}>
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
          {!requiresMemberPick && (
            <Text style={[styles.summary, { marginTop: 8 }]}>
              Currently with {memberMap[chore.assignedTo]?.displayName ?? 'unassigned'}; will
              {masterAutoRotate ? ' rotate ' : ' stay (master switch off) '}
              on the next cycle.
            </Text>
          )}

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
              style={[
                styles.primaryButton,
                (submitting || !isDirty || !title.trim()) && styles.primaryButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={submitting || !isDirty || !title.trim()}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>{submitting ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>

          {/* Delete */}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            disabled={submitting}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color={CH.danger} />
            <Text style={styles.deleteButtonText}>Delete chore</Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  }
);

ChoreDetailSheet.displayName = 'ChoreDetailSheet';

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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: CH.plateBorder,
    backgroundColor: CH.white,
  },
  chipActive: {
    backgroundColor: CH.fill,
    borderColor: CH.fill,
  },
  chipText: {
    fontSize: 14,
    color: CH.textStrong,
    fontWeight: '500',
  },
  summary: {
    color: CH.textSoft,
    fontSize: 13,
    marginBottom: 8,
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
  chipTextActive: {
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
  avatarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  avatarItem: {
    alignItems: 'center',
    width: 64,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarCircleActive: {
    borderColor: CH.fill,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: CH.white,
  },
  avatarName: {
    fontSize: 12,
    color: CH.textSoft,
    marginTop: 4,
    fontWeight: '500',
  },
  avatarNameActive: {
    color: CH.textStrong,
    fontWeight: '700',
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
  },
  deleteButtonText: {
    color: CH.danger,
    fontSize: 13,
    fontWeight: '600',
  },
});
