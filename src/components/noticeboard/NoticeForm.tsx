import { forwardRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';

const TAGS = ['House', 'Chore', 'Shopping', 'Event'] as const;
type Tag = typeof TAGS[number];

export interface NewNoticeInput {
  title: string;
  notes: string;
  tag: Tag | null;
}

interface Props {
  onSubmit: (input: NewNoticeInput) => Promise<void>;
}

export const NoticeForm = forwardRef<BottomSheetModal, Props>(({ onSubmit }, ref) => {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [tag, setTag] = useState<Tag | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTitle('');
    setNotes('');
    setTag(null);
    setSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({ title: title.trim(), notes: notes.trim(), tag });
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
          <Text style={styles.headerTitle}>New Notice</Text>
          <TouchableOpacity
            onPress={() => (ref as React.RefObject<BottomSheetModal>).current?.dismiss()}
            hitSlop={10}
          >
            <Ionicons name="close" size={22} color="#2D1A0E" />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          placeholder="Type here..."
          placeholderTextColor="#B0A090"
          value={title}
          onChangeText={setTitle}
        />

        {/* Notes */}
        <Text style={styles.label}>Additional Notes (Optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Type here..."
          placeholderTextColor="#B0A090"
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

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, (!title.trim() || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.8}
          disabled={!title.trim() || submitting}
        >
          <Text style={styles.submitBtnText}>{submitting ? 'Sending…' : 'Send Notice'}</Text>
        </TouchableOpacity>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  sheet: { backgroundColor: '#FFFBF5' },
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginBottom: 8,
  },
  headerTitle: {
    fontFamily: 'AlbertSans_700Bold',
    fontSize: 22,
    color: '#2D1A0E',
  },
  label: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 14,
    color: '#2D1A0E',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#DFE6E9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 14,
    color: '#2D1A0E',
    backgroundColor: '#fff',
  },
  notesInput: {
    height: 100,
    paddingTop: 12,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tagPill: {
    borderWidth: 1.5,
    borderColor: '#2D1A0E',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  tagPillActive: {
    backgroundColor: '#2D1A0E',
  },
  tagText: {
    fontFamily: 'AlbertSans_500Medium',
    fontSize: 14,
    color: '#2D1A0E',
  },
  tagTextActive: {
    color: '#fff',
  },
  submitBtn: {
    marginTop: 32,
    backgroundColor: '#2D1A0E',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 16,
    color: '#fff',
  },
});
