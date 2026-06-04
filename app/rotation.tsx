import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RotationCard } from '@/src/components/settings/RotationCard';
import { useChores } from '@/src/hooks/useChores';
import { useHouseStore } from '@/src/store/houseStore';
import type { Chore } from '@/src/types';
import { recurrenceLabel } from '@/src/utils/choreSchedule';

const S = {
  bg: '#FFFBF5',
  textStrong: '#372B73',
  border: '#CBC1FA',
  sectionTitle: '#1A1A1A',
  sectionBody: '#7A6652',
  rowBg: '#F7F4F0',
  rowBorder: '#EDE8E0',
  meta: '#7A6652',
};

export default function RotationScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close rotation schedule"
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={24} color={S.textStrong} />
        </Pressable>
        <Text style={styles.title}>Rotation Schedule</Text>
        <View style={styles.closeButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <RotationCard />
        <RecurringChoresSection />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: S.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: S.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  pressed: { opacity: 0.6 },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: S.textStrong,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionWrap: {
    marginTop: 22,
  },
  sectionTitle: {
    fontFamily: 'AlbertSans_700Bold',
    fontSize: 16,
    color: S.sectionTitle,
  },
  sectionBody: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: S.sectionBody,
    marginTop: 6,
  },
  sectionList: {
    marginTop: 14,
    gap: 10,
  },
  choreRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: S.rowBorder,
    backgroundColor: S.rowBg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  choreTitle: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 14,
    color: S.sectionTitle,
  },
  choreMeta: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 12,
    color: S.meta,
    marginTop: 2,
  },
  assigneeRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assigneeBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assigneeBadgeText: {
    color: '#FFFFFF',
    fontFamily: 'AlbertSans_700Bold',
    fontSize: 10,
  },
  assigneeText: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 12,
    color: S.meta,
  },
  emptyState: {
    marginTop: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 14,
    color: S.sectionBody,
  },
});

function initialOf(name: string | undefined | null): string {
  if (!name) return '?';
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed[0].toUpperCase() : '?';
}

function RecurringChoresSection() {
  const { chores } = useChores();
  const memberMap = useHouseStore((s) => s.memberMap);

  // Only chores opted into auto-rotate participate in the "rotation schedule"
  // surface. Recurring chores with a pinned assignee live on the Chores tab.
  const recurring = useMemo<Chore[]>(
    () => chores.filter((c) => c.autoRotate === true),
    [chores]
  );

  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionTitle}>Recurring Chores</Text>
      <Text style={styles.sectionBody}>
        Recurring chores repeat on the selected instances and use auto-rotate to keep things fair.
      </Text>

      {recurring.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Nothing here yet ...</Text>
        </View>
      ) : (
        <View style={styles.sectionList}>
          {recurring.map((chore) => {
            const assignee = memberMap[chore.assignedTo];
            const badgeColor = assignee?.color ?? S.rowBorder;
            return (
              <View key={chore.id} style={styles.choreRow}>
                <Text style={styles.choreTitle}>{chore.title}</Text>
                <Text style={styles.choreMeta}>{recurrenceLabel(chore)}</Text>
                <View style={styles.assigneeRow}>
                  <View style={[styles.assigneeBadge, { backgroundColor: badgeColor }]}>
                    <Text style={styles.assigneeBadgeText}>
                      {initialOf(assignee?.displayName)}
                    </Text>
                  </View>
                  <Text style={styles.assigneeText}>
                    Currently assigned to {assignee?.displayName ?? '—'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
