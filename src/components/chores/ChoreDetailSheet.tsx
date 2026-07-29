import { useHouseStore } from '@/src/store/houseStore';
import { CHORE_THEME } from '@/src/theme/chores';
import type { Chore, CustomIntervalUnit, CustomRecurrence } from '@/src/types';
import { recurrenceLabel as formatRecurrenceLabel } from '@/src/utils/choreSchedule';
import { confirm, notify } from '@/src/utils/confirm';
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
import { Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AssignmentTile } from './AssignmentTile';
import { MonthDayPicker } from './MonthDayPicker';
import { RecurrenceDropdown } from './RecurrenceDropdown';

const RECURRENCES: { label: string; value: Chore['recurrence'] }[] = [
  { label: 'Does not repeat', value: 'once' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Custom', value: 'custom' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
    const [recurrence, setRecurrence] = useState<Chore['recurrence']>('once');
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
      setTitle(chore.title);
      setAssignedTo(chore.assignedTo);
      setRecurrence(chore.recurrence);
      setAutoRotate(!!chore.autoRotate);
      setDayOfWeek(chore.dayOfWeek ?? 0);
      setDayOfMonth(chore.dayOfMonth ?? 1);
      // Seed custom controls from the stored shape, or sensible defaults when
      // switching INTO custom from a different recurrence in the editor.
      const cr = chore.customRecurrence ?? null;
      setCustomCount(cr?.count ?? 1);
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
    const supportsAutoRotate = recurrence !== 'once';
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
      assignedTo !== chore.assignedTo ||
      recurrence !== chore.recurrence ||
      (supportsAutoRotate && autoRotate !== !!chore.autoRotate) ||
      (showWeeklyDayPicker && dayOfWeek !== (chore.dayOfWeek ?? 0)) ||
      (showMonthlyDayPicker && dayOfMonth !== (chore.dayOfMonth ?? 1)) ||
      customDirty ||
      (showDueDatePicker && (dueDate?.getTime() ?? null) !== (chore.dueAt?.toDate().getTime() ?? null));

    const handleSave = async () => {
      if (!chore) return;
      const trimmed = title.trim();
      if (!trimmed) {
        notify('Title required', 'Please enter a chore name.');
        return;
      }

      // Validate custom shape before building the patch.
      if (recurrence === 'custom') {
        if (customCount < 1) {
          notify('Invalid interval', 'Repeat-every count must be at least 1.');
          return;
        }
        if (customUnit === 'weeks' && customDays.length === 0) {
          notify('Pick a day', 'Choose at least one day of the week to repeat on.');
          return;
        }
      }

      const patch: ChoreUpdatePatch = {};
      if (trimmed !== chore.title) patch.title = trimmed;
      if (assignedTo && assignedTo !== chore.assignedTo) {
        patch.assignedTo = assignedTo;
      }
      if (recurrence !== chore.recurrence) {
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
        notify('Could not update chore', err.message ?? 'Unknown error');
      } finally {
        setSubmitting(false);
      }
    };

    const handleDelete = async () => {
      if (!chore) return;
      const ok = await confirm({
        title: 'Delete chore?',
        message: `"${chore.title}" will be removed. This cannot be undone.`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        destructive: true,
      });
      if (!ok) return;
      setSubmitting(true);
      try {
        await onDelete(chore.id);
        (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();
      } catch (err: any) {
        notify('Could not delete chore', err.message ?? 'Unknown error');
      } finally {
        setSubmitting(false);
      }
    };

    const handleAddToCalendar = () => {
      notify('Coming soon', 'Calendar sync will be available in a future update.');
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
              <Ionicons name="close" size={24} color={CHORE_THEME.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerDivider} />

          {/* Chore Name */}
          <Text style={styles.label}>Chore Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Clean the bathroom"
            placeholderTextColor={CHORE_THEME.textMuted}
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
                        color: CHORE_THEME.text,
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
          <Text style={styles.label}>{autoRotate ? 'Starts with' : 'Assignment'}</Text>
          <View style={styles.avatarRow}>
            {memberIds.map((uid) => {
              const m = memberMap[uid];
              const active = assignedTo === uid;
              return (
                <AssignmentTile
                  key={uid}
                  label={m.displayName}
                  initial={initialOf(m.displayName)}
                  color={m.color}
                  selected={active}
                  onPress={() => setAssignedTo(uid)}
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
          {autoRotate && (
            <Text style={[styles.summary, { marginTop: 8 }]}>
              Starts with {memberMap[assignedTo]?.displayName ?? 'unassigned'}; will
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
            <Ionicons name="trash-outline" size={16} color={CHORE_THEME.danger} />
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
    fontSize: 22,
    fontWeight: '800',
    color: CHORE_THEME.text,
  },
  headerDivider: {
    height: 1,
    backgroundColor: CHORE_THEME.hairline,
    marginTop: 10,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: CHORE_THEME.textMuted,
    marginBottom: 8,
    marginTop: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: CHORE_THEME.hairline,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: CHORE_THEME.text,
    backgroundColor: CHORE_THEME.cardBg,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CHORE_THEME.hairline,
    backgroundColor: CHORE_THEME.cardBg,
  },
  chipActive: {
    backgroundColor: CHORE_THEME.accent,
    borderColor: CHORE_THEME.accent,
  },
  chipText: {
    fontSize: 14,
    color: CHORE_THEME.text,
    fontWeight: '500',
  },
  summary: {
    color: CHORE_THEME.textMuted,
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: CHORE_THEME.hairline,
    backgroundColor: CHORE_THEME.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: CHORE_THEME.text,
    lineHeight: 22,
  },
  stepperValue: {
    minWidth: 36,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: CHORE_THEME.text,
  },
  unitGroup: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
  },
  chipTextActive: {
    color: CHORE_THEME.onAccent,
    fontWeight: '700',
  },
  datePickerContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dateButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: CHORE_THEME.hairline,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: CHORE_THEME.cardBg,
  },
  dateButtonText: {
    fontSize: 16,
    color: CHORE_THEME.text,
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CHORE_THEME.hairline,
    backgroundColor: CHORE_THEME.cardBg,
  },
  clearButtonText: {
    fontSize: 14,
    color: CHORE_THEME.text,
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
    borderColor: CHORE_THEME.accent,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: CHORE_THEME.onAccent,
  },
  avatarName: {
    fontSize: 12,
    color: CHORE_THEME.textMuted,
    marginTop: 4,
    fontWeight: '500',
  },
  avatarNameActive: {
    color: CHORE_THEME.text,
    fontWeight: '700',
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
    color: CHORE_THEME.text,
    fontWeight: '600',
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
    color: CHORE_THEME.onAccent,
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
    color: CHORE_THEME.danger,
    fontSize: 13,
    fontWeight: '600',
  },
});
