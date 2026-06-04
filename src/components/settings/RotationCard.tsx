import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    Pressable,
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';
import DraggableFlatList, {
    RenderItemParams,
    ScaleDecorator,
} from 'react-native-draggable-flatlist';

import { setMemberOrder, setWeeklyScrambleEnabled } from '@/src/firebase/house';
import { useHouseStore } from '@/src/store/houseStore';
import { nextMondayDate } from '@/src/utils/weekKey';

const S = {
  cardBg: '#FFFFFF',
  cardBorder: '#EDE8E0',
  textStrong: '#1A1A1A',
  textSoft: '#7A6652',
  pillBg: '#F7F4F0',
  saveBg: '#2B1B15',
  saveText: '#FFFFFF',
};

function initialOf(name: string | undefined | null): string {
  if (!name) return '?';
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed[0].toUpperCase() : '?';
}

interface MemberItem {
  id: string;
  name: string;
  color: string;
  avatarUrl?: string | null;
}

export function RotationCard() {
  const house = useHouseStore((s) => s.house);
  const memberMap = useHouseStore((s) => s.memberMap);
  const setHouse = useHouseStore((s) => s.setHouse);

  const memberIds = house?.memberIds ?? [];

  const [editing, setEditing] = useState(false);
  const [localOrder, setLocalOrder] = useState<string[]>(memberIds);
  const [saving, setSaving] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);

  // Reset local edit state whenever the house identity changes (e.g. user
  // switches houses mid-edit). Also keep `localOrder` in sync with the
  // canonical order when not editing, so external mutations (another device
  // saving a new order) flow through.
  useEffect(() => {
    if (!editing) {
      setLocalOrder(memberIds);
    }
    // Intentionally key on the joined ids string + editing flag so this
    // resyncs whenever the upstream order really changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberIds.join('|'), editing]);

  useEffect(() => {
    // House switch — abandon any in-flight edit.
    setEditing(false);
  }, [house?.id]);

  const enabled = !!house?.weeklyScrambleEnabled;

  const handleToggle = useCallback(
    async (next: boolean) => {
      if (!house || savingToggle) return;
      setHouse({ ...house, weeklyScrambleEnabled: next });
      setSavingToggle(true);
      try {
        await setWeeklyScrambleEnabled(house.id, next);
      } catch (err) {
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

  const startEditing = useCallback(() => {
    setLocalOrder(memberIds);
    setEditing(true);
  }, [memberIds]);

  const cancelEditing = useCallback(() => {
    setLocalOrder(memberIds);
    setEditing(false);
  }, [memberIds]);

  const handleSave = useCallback(async () => {
    if (!house || saving) return;
    // No-op if nothing changed.
    if (localOrder.join('|') === memberIds.join('|')) {
      setEditing(false);
      return;
    }
    const previous = memberIds;
    setHouse({ ...house, memberIds: localOrder });
    setSaving(true);
    try {
      await setMemberOrder(house.id, localOrder, previous);
      setEditing(false);
    } catch (err) {
      // Revert optimistic update on failure.
      setHouse({ ...house, memberIds: previous });
      const message =
        (err as { message?: string })?.message ?? 'Could not save rotation order.';
      if (Platform.OS === 'web') {
        globalThis.alert?.(message);
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setSaving(false);
    }
  }, [house, localOrder, memberIds, saving, setHouse]);

  if (!house) return null;

  const pillLabel = enabled
    ? `Next Rotation: ${format(nextMondayDate(), 'MMM d')}`
    : 'Auto-rotate off';

  const items: MemberItem[] = localOrder.map((id) => {
    const m = memberMap[id];
    return {
      id,
      name: m?.displayName ?? '',
      color: m?.color ?? S.cardBorder,
      avatarUrl: m?.avatarUrl,
    };
  });

  const canEdit = memberIds.length > 1;

  return (
    <>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.heading}>Current Rotation</Text>
          {editing ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel rotation edits"
              onPress={cancelEditing}
              hitSlop={8}
              style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          ) : (
            canEdit && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit rotation order"
                onPress={startEditing}
                hitSlop={8}
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
              >
                <Ionicons name="create-outline" size={18} color={S.textStrong} />
              </Pressable>
            )
          )}
        </View>

        {!editing && (
          <View style={styles.pill}>
            <Text style={styles.pillText}>{pillLabel}</Text>
          </View>
        )}

        {editing ? (
          items.length > 0 && (
            <View style={styles.draggableWrap}>
              <DraggableFlatList
                horizontal
                data={items}
                keyExtractor={(item) => item.id}
                onDragEnd={({ data }) => setLocalOrder(data.map((d) => d.id))}
                activationDistance={8}
                contentContainerStyle={styles.draggableContent}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item, drag, isActive }: RenderItemParams<MemberItem>) => (
                  <ScaleDecorator>
                    <Pressable
                      onLongPress={drag}
                      delayLongPress={150}
                      disabled={isActive}
                      style={[styles.dragCard, isActive && styles.dragCardActive]}
                    >
                      {item.avatarUrl ? (
                        <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                      ) : (
                        <View style={[styles.avatar, { backgroundColor: item.color }]}>
                          <Text style={styles.avatarText}>{initialOf(item.name)}</Text>
                        </View>
                      )}
                      <Text style={styles.avatarName} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </Pressable>
                  </ScaleDecorator>
                )}
              />
            </View>
          )
        ) : (
          items.length > 0 && (
            <View style={[styles.avatarsRow, !enabled && styles.dimmed]}>
              {items.map((item, idx) => (
                <View key={item.id} style={styles.avatarGroup}>
                  <View style={styles.avatarColumn}>
                    {item.avatarUrl ? (
                      <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, { backgroundColor: item.color }]}>
                        <Text style={styles.avatarText}>{initialOf(item.name)}</Text>
                      </View>
                    )}
                    <Text style={styles.avatarName} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                  {idx < items.length - 1 && (
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color={S.textSoft}
                      style={styles.arrow}
                    />
                  )}
                </View>
              ))}
            </View>
          )
        )}
      </View>

      {editing && (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save rotation order"
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && !saving && styles.saveButtonPressed,
              saving && styles.saveButtonDisabled,
            ]}
          >
            {saving ? (
              <ActivityIndicator color={S.saveText} />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </Pressable>

          <View style={styles.autoRotateRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.autoRotateTitle}>Auto-rotate weekly</Text>
              <Text style={styles.autoRotateSubtitle}>
                Chores opted into auto-rotate shuffle on their cycle. Off pins everything to its current assignee.
              </Text>
            </View>
            <Switch value={enabled} onValueChange={handleToggle} disabled={savingToggle} />
          </View>
        </>
      )}
    </>
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
  cancelButton: { paddingHorizontal: 4, paddingVertical: 2 },
  cancelText: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 13,
    color: S.textSoft,
  },
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
  draggableWrap: {
    marginHorizontal: -4,
  },
  draggableContent: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 10,
  },
  dragCard: {
    width: 76,
    paddingVertical: 10,
    paddingHorizontal: 6,
    backgroundColor: S.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: S.cardBorder,
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  dragCardActive: {
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  saveButton: {
    marginTop: 16,
    backgroundColor: S.saveBg,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  saveButtonPressed: { opacity: 0.85 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 15,
    color: S.saveText,
  },
  autoRotateRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 4,
  },
  autoRotateTitle: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 14,
    color: S.textStrong,
  },
  autoRotateSubtitle: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 12,
    color: S.textSoft,
    marginTop: 4,
    lineHeight: 16,
  },
});
