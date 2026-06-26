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
import HeaderSvg from '@/assets/images/header.svg';

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
          <HeaderSvg width="100%" height={76} preserveAspectRatio="xMidYMid slice" style={styles.headerBg} pointerEvents="none" />
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

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, (!title.trim() || submitting) && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={!title.trim() || submitting}
          >
            <Text style={styles.submitBtnText}>{submitting ? 'Sending...' : 'Send Notice'}</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetScrollView>
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
});
