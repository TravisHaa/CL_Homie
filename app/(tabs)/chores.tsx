import { ChoreDetailSheet } from '@/src/components/chores/ChoreDetailSheet';
import { ChoreForm } from '@/src/components/chores/ChoreForm';
import { ChoresEmptyState } from '@/src/components/chores/ChoresEmptyState';
import { Avatar } from '@/src/components/ui';
import { useChores } from '@/src/hooks/useChores';
import { useHouseStore } from '@/src/store/houseStore';
import { PALETTE, RADIUS, SPACING, TYPE } from '@/src/theme/palette';
import type { Chore } from '@/src/types';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChoresScreen() {
  const { chores, isLoading, addChore, toggleChore, updateChore, deleteChore } = useChores();
  const memberMap = useHouseStore((s) => s.memberMap);
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={TYPE.header}>Chores</Text>
        <Pressable
          accessibilityLabel="Add chore"
          style={styles.add}
          onPress={() => sheetRef.current?.present()}
        >
          <Ionicons name="add" size={24} color={PALETTE.onAction} />
        </Pressable>
      </View>

      {total > 0 && (
        <View style={styles.progressWrap}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{done}/{total} done this week</Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={PALETTE.teal} />
      ) : (
        <FlatList
          data={chores}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<ChoresEmptyState />}
          renderItem={({ item }) => {
            const member = memberMap[item.assignedTo];
            return (
              <Pressable style={styles.row} onPress={() => openChoreDetail(item)}>
                <Pressable
                  hitSlop={8}
                  onPress={() => toggleChore(item.id)}
                  style={[styles.checkbox, item.isCompleted && styles.checkboxDone]}
                >
                  {item.isCompleted ? (
                    <Ionicons name="checkmark" size={14} color={PALETTE.onAction} />
                  ) : null}
                </Pressable>
                <Text style={[styles.choreTitle, item.isCompleted && styles.choreTitleDone]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Avatar name={member?.displayName} uri={member?.avatarUrl} color={member?.color} size={28} />
              </Pressable>
            );
          }}
        />
      )}

      <ChoreForm ref={sheetRef} onSubmit={addChore} />
      <ChoreDetailSheet ref={detailRef} chore={selectedChore} onUpdate={updateChore} onDelete={deleteChore} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PALETTE.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  add: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    backgroundColor: PALETTE.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressWrap: { paddingHorizontal: SPACING.base, marginBottom: SPACING.sm },
  track: { height: 6, backgroundColor: PALETTE.tealTint, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: PALETTE.teal, borderRadius: 3 },
  progressLabel: { ...TYPE.small, color: PALETTE.inkMuted, marginTop: SPACING.xs },
  loader: { flex: 1, justifyContent: 'center' },
  list: { padding: SPACING.base, gap: SPACING.sm, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: PALETTE.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: PALETTE.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: PALETTE.teal, borderColor: PALETTE.teal },
  choreTitle: { ...TYPE.bodyMedium, color: PALETTE.ink, flex: 1 },
  choreTitleDone: { textDecorationLine: 'line-through', color: PALETTE.inkFaint },
});
