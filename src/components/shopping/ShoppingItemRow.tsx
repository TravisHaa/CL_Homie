import { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, Animated, Image } from 'react-native';
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
  onDelete: (itemId: string) => Promise<void>;
  onEdit: (item: ShoppingItem) => void;
  onBought: (item: ShoppingItem) => void;
  onUndo: (itemId: string) => Promise<void>;
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

export function ShoppingItemRow({ item, memberMap, currentUserId, onToggle, onDelete, onEdit, onBought, onUndo }: Props) {
  const addedByInfo = memberMap[item.addedBy];
  const checkedByInfo = item.checkedBy ? memberMap[item.checkedBy] : null;
  const displayInfo = checkedByInfo ?? addedByInfo;

  const buyerName = !item.checkedBy
    ? null
    : item.checkedBy === currentUserId
    ? 'You'
    : (checkedByInfo?.displayName ?? 'Someone');

  const [isFlipped, setIsFlipped] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const flip = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setIsFlipped((v) => !v), 120);
  };

  if (item.isChecked) {
    return (
      <Pressable onPress={() => setShowUndo((v) => !v)}>
        <Animated.View style={[styles.checkedCard, { transform: [{ scaleY: scaleAnim }] }]}>
          <View style={styles.checkedCheck}>
            <Ionicons name="checkmark" size={14} color="#3D6B5E" />
          </View>

          <View style={styles.body}>
            <Text style={styles.checkedName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.metaRow}>
              {item.price ? <Text style={styles.checkedMeta}>${item.price}</Text> : null}
              {item.price && buyerName ? <Text style={styles.checkedDot}>•</Text> : null}
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
              onPress={(e) => { e.stopPropagation?.(); onUndo(item.id).catch(() => {}); }}
              activeOpacity={0.75}
            >
              <Text style={styles.undoBtnText}>Undo</Text>
            </TouchableOpacity>
          ) : (
            <MemberAvatar info={displayInfo} />
          )}
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Animated.View style={[styles.card, { transform: [{ scaleY: scaleAnim }] }]}>
      {!isFlipped ? (
        /* ── Front face ── */
        <TouchableOpacity style={styles.inner} onPress={flip} activeOpacity={0.75}>
          <View style={styles.iconWrap}>
            <Ionicons name="bag-handle-outline" size={20} color="#7A6652" />
          </View>

          <View style={styles.body}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <View style={styles.metaRow}>
              {item.isAsap ? (
                <>
                  <View style={[styles.deadlinePill, styles.asapPill]}>
                    <Text style={styles.deadlinePillText}>ASAP</Text>
                  </View>
                  {item.price ? <Text style={styles.metaDivider}>|</Text> : null}
                  {item.price ? <Text style={styles.metaPrice}>${item.price} est.</Text> : null}
                </>
              ) : item.neededBy ? (
                <>
                  <View style={styles.deadlinePill}>
                    <Text style={styles.deadlinePillText}>
                      by {item.neededBy.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  {item.price ? <Text style={styles.metaDivider}>|</Text> : null}
                  {item.price ? <Text style={styles.metaPrice}>${item.price} est.</Text> : null}
                </>
              ) : item.price ? (
                <Text style={styles.metaPrice}>${item.price} est.</Text>
              ) : (
                <Text style={styles.metaPrice}>qty {item.quantity}</Text>
              )}
            </View>
          </View>

          <MemberAvatar info={displayInfo} />
        </TouchableOpacity>
      ) : (
        /* ── Back face — tap anywhere to flip back ── */
        <TouchableOpacity style={styles.inner} onPress={flip} activeOpacity={1}>
          <TouchableOpacity style={styles.backBtn} onPress={() => { flip(); onEdit(item); }} activeOpacity={0.75}>
            <Text style={styles.backBtnText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => { setIsFlipped(false); onBought(item); }}
            activeOpacity={0.75}
          >
            <Text style={styles.backBtnText}>Bought</Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          <TouchableOpacity
            onPress={() => onDelete(item.id).catch(() => {})}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={22} color="#C0392B" />
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </Animated.View>
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
    color: '#1A1A1A',
    marginBottom: 5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deadlinePill: {
    backgroundColor: '#2D1A0E',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  deadlinePillText: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 12,
    color: '#fff',
  },
  asapPill: {
    backgroundColor: '#C15B2A',
  },
  metaDivider: {
    fontFamily: 'AlbertSans_400Regular',
    color: '#DFE6E9',
    fontSize: 14,
  },
  metaPrice: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 13,
    color: '#636e72',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'AlbertSans_700Bold',
    fontSize: 15,
    color: '#fff',
  },

  // ── Back face ──────────────────────────────────────────────────────────────
  backBtn: {
    borderWidth: 1.5,
    borderColor: '#2D1A0E',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  backBtnText: {
    fontFamily: 'AlbertSans_500Medium',
    fontSize: 12,
    color: '#2D1A0E',
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
  checkedDot: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 13,
    color: '#C4C4C4',
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
