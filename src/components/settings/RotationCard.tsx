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
import { recurrenceLabel } from '@/src/utils/choreSchedule';
import { nextMondayDate } from '@/src/utils/weekKey';

const S = {
  cardBg: '#FFFFFF',
  cardBorder: '#EDE8E0',
  textStrong: '#1A1A1A',
  textSoft: '#7A6652',
  pillBg: '#F7F4F0',
};

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

  // Show only chores opted into auto-rotate — the per-chore flag is now the
  // source of truth for what's part of "the rotation". Recurring chores with
  // a pinned assignee are intentionally hidden here.
  const recurringChores = useMemo(
    () => chores.filter((c) => c.autoRotate === true),
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
                Master switch — chores opted into auto-rotate will shuffle on their cycle. Off pins
                everything to its current assignee.
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
    backgroundColor: S.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: S.cardBorder,
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  heading: {
    fontFamily: 'AlbertSans_700Bold',
    fontSize: 15,
    color: S.textStrong,
  },
  iconButton: { padding: 4 },
  pressed: { opacity: 0.7 },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: S.pillBg,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: S.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 14,
  },
  pillText: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 12,
    color: S.textSoft,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    marginBottom: 14,
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
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    fontFamily: 'AlbertSans_700Bold',
    fontSize: 18,
    color: '#fff',
  },
  avatarName: {
    marginTop: 4,
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 11,
    color: S.textSoft,
  },
  arrow: { marginHorizontal: 2 },
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: S.pillBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: S.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  expandText: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 13,
    color: S.textStrong,
  },
  choreList: { marginTop: 10, gap: 8 },
  choreRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: S.cardBorder,
    backgroundColor: S.pillBg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  choreTitle: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 14,
    color: S.textStrong,
  },
  choreMeta: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 12,
    color: S.textSoft,
    marginTop: 2,
  },
  assigneeRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  assigneeText: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 12,
    color: S.textSoft,
  },
  emptyText: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 13,
    color: S.textSoft,
  },
  sheetBackground: { backgroundColor: '#FFFBF5' },
  sheetHandle: { backgroundColor: S.cardBorder },
  sheetContent: { padding: 20 },
  sheetTitle: {
    fontFamily: 'GowunBatang_700Bold',
    fontSize: 18,
    color: S.textStrong,
    marginBottom: 14,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sheetRowTitle: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 14,
    color: S.textStrong,
  },
  sheetRowSubtitle: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 12,
    color: S.textSoft,
    marginTop: 4,
    lineHeight: 16,
  },
});
