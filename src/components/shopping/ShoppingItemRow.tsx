import { useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ShoppingItem } from '@/src/types';

interface MemberInfo {
  displayName: string;
  color: string;
  avatarUrl: string | null;
}

interface Props {
  item: ShoppingItem;
  memberMap: Record<string, MemberInfo>;
  currentUserId?: string;
  onToggle: (itemId: string, currentValue: boolean) => Promise<void>;
}

function boughtWhen(ts: any): string {
  if (!ts) return 'recently';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  return `${diffDays} days ago`;
}

function MemberAvatar({ info, size = 38 }: { info?: MemberInfo | null; size?: number }) {
  const radius = size / 2;
  if (info?.avatarUrl) {
    return <Image source={{ uri: info.avatarUrl }} style={{ width: size, height: size, borderRadius: radius }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: info?.color ?? '#B0BEC5', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[styles.avatarInitial, { fontSize: size * 0.39 }]}>
        {info?.displayName?.charAt(0).toUpperCase() ?? '?'}
      </Text>
    </View>
  );
}

export function ShoppingItemRow({ item, memberMap, currentUserId, onToggle }: Props) {
  const addedByInfo = memberMap[item.addedBy];
  const checkedByInfo = item.checkedBy ? memberMap[item.checkedBy] : null;
  const displayInfo = checkedByInfo ?? addedByInfo;

  const buyerName = !item.checkedBy
    ? null
    : item.checkedBy === currentUserId
    ? 'You'
    : (checkedByInfo?.displayName ?? 'Someone');

  const [showUndo, setShowUndo] = useState(false);

  if (item.isChecked) {
    return (
      <Pressable onPress={() => setShowUndo((v) => !v)}>
        <View style={styles.checkedCard}>
          <View style={styles.checkedCheck}>
            <Ionicons name="checkmark" size={14} color="#3D6B5E" />
          </View>

          <View style={styles.body}>
            <Text style={styles.checkedName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.metaRow}>
              {buyerName ? (
                <Text style={styles.checkedMeta}>
                  <Text style={buyerName === 'You' ? styles.checkedYou : undefined}>{buyerName}</Text>
                  {' bought '}{boughtWhen(item.checkedAt)}
                </Text>
              ) : null}
            </View>
          </View>

          {showUndo ? (
            <TouchableOpacity
              style={styles.undoBtn}
              onPress={(e) => { e.stopPropagation?.(); onToggle(item.id, true).catch(() => {}); }}
              activeOpacity={0.75}
            >
              <Text style={styles.undoBtnText}>Undo</Text>
            </TouchableOpacity>
          ) : (
            <MemberAvatar info={displayInfo} />
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.inner}
        onPress={() => onToggle(item.id, false).catch((err: any) => console.error('Toggle failed:', err))}
        activeOpacity={0.75}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="bag-handle-outline" size={20} color="#7A6652" />
        </View>

        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaPrice}>qty {item.quantity}</Text>
          </View>
        </View>

        <MemberAvatar info={displayInfo} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    height: 72,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5EDE3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  name: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 15,
    color: '#2E0800',
    marginBottom: 5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaPrice: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 13,
    color: '#636e72',
  },
  avatarInitial: {
    fontFamily: 'AlbertSans_700Bold',
    fontSize: 15,
    color: '#fff',
  },

  // ── Checked / bought face ──────────────────────────────────────────────────
  checkedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginBottom: 6,
    gap: 12,
    backgroundColor: 'transparent',
    height: 60,
  },
  checkedCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#3D6B5E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedName: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 15,
    color: '#aaa',
    textDecorationLine: 'line-through',
    marginBottom: 3,
  },
  checkedMeta: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 13,
    color: '#636e72',
  },
  checkedYou: {
    fontFamily: 'AlbertSans_600SemiBold',
    color: '#3D6B5E',
  },
  undoBtn: {
    borderWidth: 1.5,
    borderColor: '#3D6B5E',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  undoBtnText: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 12,
    color: '#3D6B5E',
  },
});
