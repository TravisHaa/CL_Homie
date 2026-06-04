import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal, BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GridBackground } from '@/src/components/GridBackground';
import HeaderSvg from '@/assets/images/header.svg';
import AddButtonSvg from '@/assets/images/Add-Button.svg';
import { NoticeForm, type NewNoticeInput } from '@/src/components/noticeboard/NoticeForm';
import { NoticeCard } from '@/src/components/noticeboard/NoticeCard';

const FILTERS = ['All', 'House', 'Chore', 'Shopping', 'Event'] as const;
type Filter = typeof FILTERS[number];

interface Notice extends NewNoticeInput {
  id: string;
  createdAt: Date;
}

export default function NoticeBoardScreen() {
  const router = useRouter();
  const formRef = useRef<BottomSheetModal>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [activeFilter, setActiveFilter] = useState<Filter>('All');

  const handleSubmit = async (input: NewNoticeInput) => {
    setNotices((prev) => [
      { ...input, id: Date.now().toString(), createdAt: new Date() },
      ...prev,
    ]);
  };

  const filtered = activeFilter === 'All'
    ? notices
    : notices.filter((n) => n.tag === activeFilter);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <View style={styles.safe}>
          <GridBackground />
          <View style={{ width: '100%', overflow: 'hidden' }}>
            <HeaderSvg width="100%" height={117} preserveAspectRatio="xMidYMid slice" />
            <Pressable
              style={styles.backButton}
              onPress={() => router.navigate('/(tabs)')}
              hitSlop={16}
              accessibilityLabel="Back to home"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={22} color="#2E0800" />
            </Pressable>
            <Text style={styles.headerTitle}>Notice Board</Text>

            {/* Filter pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterBar}
              contentContainerStyle={styles.filterBarContent}
            >
              {FILTERS.map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterPill, activeFilter === f && styles.filterPillActive]}
                  onPress={() => setActiveFilter(f)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.filterPillText, activeFilter === f && styles.filterPillTextActive]}>
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {notices.length === 0 ? 'No notices yet.' : 'No notices in this category.'}
                </Text>
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              >
                {filtered.map((n) => (
                  <NoticeCard
                    key={n.id}
                    title={n.title}
                    notes={n.notes}
                    tag={n.tag}
                    createdAt={n.createdAt}
                  />
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={styles.fab}
              activeOpacity={0.8}
              accessibilityLabel="Add notice"
              accessibilityRole="button"
              onPress={() => formRef.current?.present()}
            >
              <AddButtonSvg width={64} height={64} />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        <NoticeForm ref={formRef} onSubmit={handleSubmit} />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FCF5EE' },
  backButton: {
    position: 'absolute',
    top: 8,
    left: 12,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 10,
  },
  headerTitle: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: 'GowunBatang_700Bold',
    fontSize: 22,
    color: '#2E0800',
  },
  filterBar: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
  },
  filterBarContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  filterPillActive: {
    backgroundColor: '#4A7C70',
  },
  filterPillText: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 14,
    color: '#2D1A0E',
  },
  filterPillTextActive: {
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 15,
    color: '#7A6652',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 180,
  },
  fab: {
    position: 'absolute',
    bottom: 110,
    right: 20,
  },
});
