import { forwardRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { HeaderImage } from '@/src/components/HeaderImage';

const TAGS = ['House', 'Chore', 'Shopping', 'Event'] as const;
type Tag = typeof TAGS[number];

const WEB_DATE_TIME_INPUT_STYLE: React.CSSProperties = {
  flex: 1,
  width: '100%',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  fontFamily: 'AlbertSans_500Medium',
  fontSize: 16,
  fontWeight: 500,
  color: '#2E0800',
  padding: '12px 0',
  cursor: 'pointer',
  accentColor: '#4A7C70',
  colorScheme: 'light',
};

export interface NewNoticeInput {
  title: string;
  notes: string;
  tag: Tag | null;
  scheduledAt: Date | null;
}

interface Props {
  onSubmit: (input: NewNoticeInput) => Promise<void>;
}

export const NoticeForm = forwardRef<BottomSheetModal, Props>(({ onSubmit }, ref) => {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [tag, setTag] = useState<Tag | null>(null);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<Date>(() => new Date());
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [androidPickerMode, setAndroidPickerMode] = useState<'date' | 'time' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTitle('');
    setNotes('');
    setTag(null);
    setScheduledAt(null);
    setScheduleModalVisible(false);
    setAndroidPickerMode(null);
    setSubmitting(false);
  };

  const openScheduleModal = () => {
    const defaultDate = new Date(Date.now() + 60 * 60 * 1000);
    defaultDate.setSeconds(0, 0);
    setScheduleDraft(scheduledAt ?? defaultDate);
    setScheduleModalVisible(true);
  };

  const updateSchedulePart = (mode: 'date' | 'time', selected?: Date) => {
    if (!selected) return;
    setScheduleDraft((current) => {
      const next = new Date(current);
      if (mode === 'date') {
        next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      } else {
        next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({ title: title.trim(), notes: notes.trim(), tag, scheduledAt });
      reset();
      (ref as React.RefObject<BottomSheetModal>).current?.dismiss();
    } finally {
      setSubmitting(false);
    }
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={['95%']}
      bottomInset={100}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: 'transparent' }}
      backgroundStyle={styles.sheet}
      onDismiss={reset}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <HeaderImage height={76} style={styles.headerBg} pointerEvents="none" />
          <Text style={styles.headerTitle}>New Notice</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => (ref as React.RefObject<BottomSheetModal>).current?.dismiss()}
            hitSlop={6}
            accessibilityLabel="Close notice form"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={30} color="#2E0800" />
          </TouchableOpacity>
        </View>

        <View style={styles.formBody}>
          {/* Title */}
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Type here..."
            placeholderTextColor="#B9ABA2"
            value={title}
            onChangeText={setTitle}
          />

          {/* Notes */}
          <Text style={styles.label}>Additional Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Type here..."
            placeholderTextColor="#B9ABA2"
            value={notes}
            onChangeText={setNotes}
            multiline
            textAlignVertical="top"
          />

          {/* Tags */}
          <Text style={styles.label}>Tag (Optional)</Text>
          <View style={styles.tagRow}>
            {TAGS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tagPill, tag === t && styles.tagPillActive]}
                onPress={() => setTag(tag === t ? null : t)}
                activeOpacity={0.75}
              >
                <Text style={[styles.tagText, tag === t && styles.tagTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Schedule */}
          <Text style={styles.label}>Schedule Notice (Optional)</Text>
          <View style={styles.scheduleRow}>
            <TouchableOpacity
              style={styles.scheduleButton}
              onPress={openScheduleModal}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Choose notice date and time"
            >
              <Ionicons name="calendar-outline" size={20} color="#2E0800" />
              <Text style={styles.scheduleButtonText}>
                {scheduledAt ? format(scheduledAt, 'EEE, MMM d · h:mm a') : 'Choose date and time'}
              </Text>
            </TouchableOpacity>
            {scheduledAt && (
              <TouchableOpacity onPress={() => setScheduledAt(null)} hitSlop={8} accessibilityLabel="Remove schedule">
                <Ionicons name="close-circle" size={24} color="#7A6652" />
              </TouchableOpacity>
            )}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, (!title.trim() || submitting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={!title.trim() || submitting}
          >
            <Text style={styles.submitBtnText}>
              {submitting
                ? 'Sending...'
                : scheduledAt
                  ? `Send ${format(scheduledAt, 'MM/dd h:mm a')}`
                  : 'Send Notice'}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheetScrollView>

      <Modal
        visible={scheduleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setScheduleModalVisible(false)}
      >
        <View style={styles.scheduleModalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setScheduleModalVisible(false)}
            accessibilityLabel="Close schedule popup"
          />
          <View style={styles.scheduleModalCard}>
            <Text style={styles.scheduleModalTitle}>Schedule Notice</Text>

            {Platform.OS === 'web' ? (
              <View style={styles.webDateTimeInputs}>
                <View style={styles.dateTimeRow}>
                  <Ionicons name="calendar-outline" size={21} color="#2E0800" />
                  <View style={styles.webInputContent}>
                    <Text style={styles.webInputLabel}>Date</Text>
                    <input
                      type="date"
                      value={format(scheduleDraft, 'yyyy-MM-dd')}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      onChange={(event) => {
                        const [year, month, day] = event.target.value.split('-').map(Number);
                        if (!year || !month || !day) return;
                        setScheduleDraft((current) => {
                          const next = new Date(current);
                          next.setFullYear(year, month - 1, day);
                          return next;
                        });
                      }}
                      style={WEB_DATE_TIME_INPUT_STYLE}
                    />
                  </View>
                </View>
                <View style={styles.dateTimeRow}>
                  <Ionicons name="time-outline" size={22} color="#2E0800" />
                  <View style={styles.webInputContent}>
                    <Text style={styles.webInputLabel}>Time</Text>
                    <input
                      type="time"
                      value={format(scheduleDraft, 'HH:mm')}
                      onChange={(event) => {
                        const [hours, minutes] = event.target.value.split(':').map(Number);
                        if (Number.isNaN(hours) || Number.isNaN(minutes)) return;
                        setScheduleDraft((current) => {
                          const next = new Date(current);
                          next.setHours(hours, minutes, 0, 0);
                          return next;
                        });
                      }}
                      style={WEB_DATE_TIME_INPUT_STYLE}
                    />
                  </View>
                </View>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.dateTimeRow}
                  onPress={() => Platform.OS === 'android' && setAndroidPickerMode('date')}
                  activeOpacity={Platform.OS === 'android' ? 0.7 : 1}
                >
                  <Ionicons name="calendar-outline" size={21} color="#2E0800" />
                  <Text style={styles.dateTimeText}>{format(scheduleDraft, 'EEEE, MMMM d, yyyy')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dateTimeRow}
                  onPress={() => Platform.OS === 'android' && setAndroidPickerMode('time')}
                  activeOpacity={Platform.OS === 'android' ? 0.7 : 1}
                >
                  <Ionicons name="time-outline" size={22} color="#2E0800" />
                  <Text style={styles.dateTimeText}>{format(scheduleDraft, 'h:mm a')}</Text>
                </TouchableOpacity>
              </>
            )}

            {Platform.OS === 'ios' && (
              <DateTimePicker
                value={scheduleDraft}
                mode="datetime"
                display="spinner"
                minimumDate={new Date()}
                onChange={(_event, selected) => selected && setScheduleDraft(selected)}
              />
            )}
            {Platform.OS === 'android' && androidPickerMode && (
              <DateTimePicker
                value={scheduleDraft}
                mode={androidPickerMode}
                display="default"
                minimumDate={androidPickerMode === 'date' ? new Date() : undefined}
                onChange={(_event, selected) => {
                  updateSchedulePart(androidPickerMode, selected);
                  setAndroidPickerMode(null);
                }}
              />
            )}

            <View style={styles.scheduleModalActions}>
              <TouchableOpacity style={styles.scheduleCancelButton} onPress={() => setScheduleModalVisible(false)}>
                <Text style={styles.scheduleCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.scheduleDoneButton}
                onPress={() => {
                  setScheduledAt(scheduleDraft);
                  setScheduleModalVisible(false);
                }}
              >
                <Text style={styles.scheduleDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  content: { paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 76,
    paddingLeft: 28,
    paddingRight: 20,
    overflow: 'hidden',
  },
  headerBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerTitle: {
    fontFamily: 'GowunBatang_700Bold',
    fontSize: 26,
    color: '#2E0800',
  },
  closeButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formBody: {
    backgroundColor: '#fff',
    paddingHorizontal: 28,
    paddingTop: 22,
  },
  label: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 16,
    color: '#2E0800',
    marginBottom: 8,
    marginTop: 18,
  },
  input: {
    borderWidth: 1.25,
    borderColor: '#4A170E',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 16,
    color: '#2E0800',
    backgroundColor: '#fff',
    minHeight: 42,
  },
  notesInput: {
    height: 84,
    paddingTop: 12,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tagPill: {
    borderWidth: 1.25,
    borderColor: '#4A170E',
    borderRadius: 999,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tagPillActive: {
    backgroundColor: '#4A170E',
  },
  tagText: {
    fontFamily: 'AlbertSans_500Medium',
    fontSize: 16,
    color: '#2E0800',
  },
  tagTextActive: {
    color: '#fff',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scheduleButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.25,
    borderColor: '#4A170E',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFF8F2',
  },
  scheduleButtonText: {
    flex: 1,
    fontFamily: 'AlbertSans_500Medium',
    fontSize: 15,
    color: '#2E0800',
  },
  submitBtn: {
    alignSelf: 'center',
    marginTop: 46,
    backgroundColor: '#4A170E',
    borderRadius: 999,
    minHeight: 52,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 16,
    color: '#fff',
  },
  scheduleModalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(46, 8, 0, 0.28)',
  },
  scheduleModalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 22,
    backgroundColor: '#FCF5EE',
    shadowColor: '#2E0800',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  scheduleModalTitle: {
    fontFamily: 'GowunBatang_700Bold',
    fontSize: 23,
    color: '#2E0800',
    marginBottom: 16,
  },
  dateTimeRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#BFA69A',
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  dateTimeText: {
    flex: 1,
    fontFamily: 'AlbertSans_500Medium',
    fontSize: 16,
    color: '#2E0800',
  },
  webDateTimeInputs: {
    width: '100%',
  },
  webInputContent: {
    flex: 1,
  },
  webInputLabel: {
    fontFamily: 'AlbertSans_500Medium',
    fontSize: 11,
    color: '#7A6652',
    marginBottom: -8,
  },
  scheduleModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  scheduleCancelButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  scheduleCancelText: {
    fontFamily: 'AlbertSans_600SemiBold',
    color: '#7A6652',
  },
  scheduleDoneButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: '#4A170E',
  },
  scheduleDoneText: {
    fontFamily: 'AlbertSans_600SemiBold',
    color: '#FFFFFF',
  },
});
