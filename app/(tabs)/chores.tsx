import { ChoreCard } from '@/src/components/chores/ChoreCard';
import { ChoreDetailSheet } from '@/src/components/chores/ChoreDetailSheet';
import { ChoreForm } from '@/src/components/chores/ChoreForm';
import { ChoresEmptyState } from '@/src/components/chores/ChoresEmptyState';
import { ProgressRing } from '@/src/components/chores/ProgressRing';
import { useChores } from '@/src/hooks/useChores';
import { useHouseStore } from '@/src/store/houseStore';
import { CHORE_THEME } from '@/src/theme/chores';
import type { Chore } from '@/src/types';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const initialOf = (name: string) => name?.trim()?.[0]?.toUpperCase() ?? '?';

export default function ChoresScreen() {
  const { chores, isLoading, addChore, toggleChore, updateChore, deleteChore } = useChores();
  const memberMap = useHouseStore((s) => s.memberMap);
  const memberIds = Object.keys(memberMap);

  const sheetRef = useRef<BottomSheetModal>(null);
  const detailRef = useRef<BottomSheetModal>(null);
  const [selectedChore, setSelectedChore] = useState<Chore | null>(null);

  const openChoreDetail = (chore: Chore) => {
    setSelectedChore(chore);
    detailRef.current?.present();
  };

  const done = chores.filter((c) => c.isCompleted).length;
  const total = chores.length;
  const progress = total > 0 ? done / total : 0;
  const percent = Math.round(progress * 100);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top bar — flush title + circular accent FAB. */}
      <View style={styles.header}>
        <Text style={styles.title}>Chores</Text>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => sheetRef.current?.present()}
          activeOpacity={0.8}
          accessibilityLabel="Add chore"
        >
          <Ionicons name="add" size={24} color={CHORE_THEME.onAccent} />
        </TouchableOpacity>
      </View>

      {/* Centerpiece — circular completion dial. */}
      <View style={styles.dialBlock}>
        <ProgressRing size={170} stroke={14} progress={progress}>
          <Text style={styles.dialPercent}>{percent}%</Text>
          <Text style={styles.dialLabel}>this week</Text>
        </ProgressRing>
        <Text style={styles.dialCaption}>
          {total === 0
            ? 'No chores yet'
            : `${done} of ${total} done`}
        </Text>

        {/* Roommate avatar row — informational. */}
        {memberIds.length > 0 && (
          <View style={styles.avatarRow}>
            {memberIds.map((uid) => {
              const m = memberMap[uid];
              return (
                <View
                  key={uid}
                  style={[styles.avatar, { backgroundColor: m.color }]}
                >
                  <Text style={styles.avatarInitial}>{initialOf(m.displayName)}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={CHORE_THEME.accent} />
      ) : (
        <FlatList
          data={chores}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChoreCard chore={item} onToggle={toggleChore} onPress={openChoreDetail} />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<ChoresEmptyState />}
        />
      )}

      <ChoreForm ref={sheetRef} onSubmit={addChore} />
      <ChoreDetailSheet
        ref={detailRef}
        chore={selectedChore}
        onUpdate={updateChore}
        onDelete={deleteChore}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CHORE_THEME.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: CHORE_THEME.text,
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: CHORE_THEME.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialBlock: {
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 16,
  },
  dialPercent: {
    fontSize: 36,
    fontWeight: '800',
    color: CHORE_THEME.text,
    lineHeight: 40,
  },
  dialLabel: {
    fontSize: 11,
    color: CHORE_THEME.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dialCaption: {
    marginTop: 12,
    fontSize: 14,
    color: CHORE_THEME.textMuted,
    fontWeight: '500',
  },
  avatarRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: CHORE_THEME.onAccent,
    fontSize: 14,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
});
