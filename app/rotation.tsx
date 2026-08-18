import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  bg: '#FFFFFF',
  textStrong: '#2E0800',
  sectionTitle: '#2E0800',
  sectionBody: '#2E0800',
  rowBg: '#FBF7F1',
  rowBorder: '#EDE3DA',
  recurrence: '#4F8688',
};

export default function RotationScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F7D1C2', '#F4E0C8', '#CDE6EA']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to chores"
              onPress={() => router.replace('/(tabs)/chores')}
              hitSlop={10}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-back" size={28} color={S.textStrong} />
            </Pressable>
            <Text style={styles.title}>Rotation Schedule</Text>
            <View style={styles.closeButton} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <RotationCard />
        <RecurringChoresSection />
      </ScrollView>
    </View>
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
    paddingVertical: 14,
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
    fontFamily: 'GowunBatang_700Bold',
    fontSize: 23,
    color: S.textStrong,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 40,
  },
  sectionWrap: {
    marginTop: 46,
  },
  sectionTitle: {
    fontFamily: 'GowunBatang_700Bold',
    fontSize: 18,
    color: S.sectionTitle,
  },
  sectionBody: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: S.sectionBody,
    marginTop: 4,
  },
  sectionList: {
    marginTop: 16,
  },
  choreRow: {
    paddingHorizontal: 10,
    paddingVertical: 14,
  },
  choreTitle: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 15,
    color: S.sectionTitle,
  },
  choreMeta: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 12,
    color: S.recurrence,
    marginTop: 2,
  },
  assigneeRow: {
    marginTop: 7,
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
    color: S.sectionBody,
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
          {recurring.map((chore, index) => {
            const assignee = memberMap[chore.assignedTo];
            const badgeColor = assignee?.color ?? S.rowBorder;
            return (
              <View
                key={chore.id}
                style={[styles.choreRow, index % 2 === 0 && { backgroundColor: S.rowBg }]}
              >
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
