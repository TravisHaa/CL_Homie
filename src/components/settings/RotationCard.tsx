import { Ionicons } from '@expo/vector-icons';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { format } from 'date-fns';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { setWeeklyScrambleEnabled } from '@/src/firebase/house';
import { useChores } from '@/src/hooks/useChores';
import { useHouseStore } from '@/src/store/houseStore';
import type { Chore } from '@/src/types';
import { nextMondayDate } from '@/src/utils/weekKey';

const S = {
  cardBg: '#E8E2FF',
  cardBorder: '#CBC1FA',
  textStrong: '#372B73',
  textSoft: '#7A6BB0',
  pillBg: '#FFFFFF',
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function recurrenceLabel(chore: Chore): string {
  switch (chore.recurrence) {
    case 'weekly':
      return chore.dayOfWeek != null ? `Every ${DAY_NAMES[chore.dayOfWeek]}` : 'Weekly';
    case 'biweekly':
      return chore.dayOfWeek != null ? `Every other ${DAY_NAMES[chore.dayOfWeek]}` : 'Every 2 weeks';
    case 'monthly':
      return 'Monthly';
    default:
      return '';
  }
}

function initialOf(name: string | undefined | null): string {
  if (!name) return '?';
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed[0].toUpperCase() : '?';
}

export function RotationCard() {
  const house = useHouseStore((s) => s.house);
  const memberMap = useHouseStore((s) => s.memberMap);
  const setHouse = useHouseStore((s) => s.setHouse);
  const { chores } = useChores();

  const [showAll, setShowAll] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['30%'], []);

  const enabled = !!house?.weeklyScrambleEnabled;
  const memberIds = house?.memberIds ?? [];
  const sortedMembers = useMemo(() => [...memberIds].sort(), [memberIds]);

  const recurringChores = useMemo(
    () => chores.filter((c) => c.recurrence !== 'once'),
    [chores]
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    []
  );

  const openSheet = useCallback(() => {
    sheetRef.current?.present();
  }, []);

  const handleToggle = useCallback(
    async (next: boolean) => {
      if (!house || savingToggle) return;
      // Optimistic update so the UI reflects the change immediately.
      setHouse({ ...house, weeklyScrambleEnabled: next });
      setSavingToggle(true);
      try {
        await setWeeklyScrambleEnabled(house.id, next);
      } catch (err) {
        // Revert on failure.
        setHouse({ ...house, weeklyScrambleEnabled: !next });
        const message =
          (err as { message?: string })?.message ?? 'Could not update rotation setting.';
        if (Platform.OS === 'web') {
          globalThis.alert?.(message);
        } else {
          Alert.alert('Error', message);
        }
      } finally {
        setSavingToggle(false);
      }
    },
    [house, savingToggle, setHouse]
  );

  if (!house) return null;

  const pillLabel = enabled ? `Next Rotation: ${format(nextMondayDate(), 'MMM d')}` : 'Auto-rotate off';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Current Rotation</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit rotation settings"
          onPress={openSheet}
          hitSlop={8}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons name="pencil" size={16} color={S.textStrong} />
        </Pressable>
      </View>

      <View style={styles.pill}>
        <Text style={styles.pillText}>{pillLabel}</Text>
      </View>

      {sortedMembers.length > 0 && (
        <View style={[styles.avatarsRow, !enabled && styles.dimmed]}>
          {sortedMembers.map((id, idx) => {
            const m = memberMap[id];
            const color = m?.color ?? S.cardBorder;
            const name = m?.displayName ?? '';
            return (
              <View key={id} style={styles.avatarGroup}>
                <View style={styles.avatarColumn}>
                  {m?.avatarUrl ? (
                    <Image source={{ uri: m.avatarUrl }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, { backgroundColor: color }]}>
                      <Text style={styles.avatarText}>{initialOf(name)}</Text>
                    </View>
                  )}
                  <Text style={styles.avatarName} numberOfLines={1}>
                    {name}
                  </Text>
                </View>
                {idx < sortedMembers.length - 1 && (
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={S.textSoft}
                    style={styles.arrow}
                  />
                )}
              </View>
            );
          })}
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={showAll ? 'Hide recurring chores' : 'See all recurring chores'}
        onPress={() => setShowAll((v) => !v)}
        style={({ pressed }) => [styles.expandRow, pressed && styles.pressed]}
      >
        <Text style={styles.expandText}>See all recurring chores</Text>
        <Ionicons
          name={showAll ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={S.textStrong}
        />
      </Pressable>

      {showAll && (
        <View style={styles.choreList}>
          {recurringChores.length === 0 ? (
            <Text style={styles.emptyText}>No recurring chores yet.</Text>
          ) : (
            recurringChores.map((chore) => {
              const assignee = memberMap[chore.assignedTo];
              const dotColor = assignee?.color ?? S.cardBorder;
              return (
                <View key={chore.id} style={styles.choreRow}>
                  <Text style={styles.choreTitle}>{chore.title}</Text>
                  <Text style={styles.choreMeta}>{recurrenceLabel(chore)}</Text>
                  <View style={styles.assigneeRow}>
                    <View style={[styles.dot, { backgroundColor: dotColor }]} />
                    <Text style={styles.assigneeText}>
                      Currently assigned to {assignee?.displayName ?? '—'}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <BottomSheetView style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Rotation settings</Text>
          <View style={styles.sheetRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetRowTitle}>Auto-rotate weekly</Text>
              <Text style={styles.sheetRowSubtitle}>
                Shuffle assignees each week so the same chore doesn’t always land on the same person.
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={handleToggle}
              disabled={savingToggle}
            />
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: S.cardBorder,
    backgroundColor: '#FFFBF5',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: { color: S.textStrong, fontWeight: '800', fontSize: 14 },
  iconButton: {
    padding: 6,
    borderRadius: 8,
  },
  pressed: { opacity: 0.7 },
  pill: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: S.pillBg,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: S.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: { color: S.textStrong, fontWeight: '700', fontSize: 12 },
  avatarsRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  dimmed: { opacity: 0.5 },
  avatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarColumn: {
    alignItems: 'center',
    width: 56,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontWeight: '800' },
  avatarName: {
    marginTop: 4,
    color: S.textSoft,
    fontSize: 11,
    fontWeight: '600',
  },
  arrow: { marginHorizontal: 2 },
  expandRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: S.cardBorder,
    backgroundColor: S.pillBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  expandText: { color: S.textStrong, fontWeight: '700', fontSize: 13 },
  choreList: { marginTop: 10, gap: 10 },
  choreRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: S.cardBorder,
    backgroundColor: S.pillBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  choreTitle: { color: S.textStrong, fontWeight: '700' },
  choreMeta: { color: S.textSoft, fontSize: 12, marginTop: 2 },
  assigneeRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  assigneeText: { color: S.textSoft, fontSize: 12 },
  emptyText: { color: S.textSoft, fontSize: 13 },
  sheetBackground: { backgroundColor: '#FFFBF5' },
  sheetHandle: { backgroundColor: S.cardBorder },
  sheetContent: { padding: 20 },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: S.textStrong,
    marginBottom: 14,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sheetRowTitle: { color: S.textStrong, fontWeight: '700', fontSize: 14 },
  sheetRowSubtitle: { color: S.textSoft, fontSize: 12, marginTop: 4, lineHeight: 16 },
});
