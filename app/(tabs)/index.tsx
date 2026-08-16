import { useCalendarEvents } from '@/src/hooks/useCalendarEvents';
import { useChores } from '@/src/hooks/useChores';
import { usePantry } from '@/src/hooks/usePantry';
import { useShoppingList } from '@/src/hooks/useShoppingList';
import { isChoreDueOn } from '@/src/utils/choreSchedule';
import { getWeekKey } from '@/src/utils/weekKey';
import { differenceInCalendarDays, format, isPast, isToday, isTomorrow } from 'date-fns';
import { useRouter } from 'expo-router';
import { Timestamp, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { GridBackground } from '@/src/components/GridBackground';
import { useAuthStore } from '@/src/store/authStore';
import { useHouseStore } from '@/src/store/houseStore';
import RecentActivitySvg from '@/assets/images/recent activity.svg';
import RecentActivityIcon from '@/assets/images/Recent Activity icon.svg';
import { Ionicons } from '@expo/vector-icons';
import CalendarIcon from '@/assets/images/CalendarIcon.svg';
import { HeaderImage } from '@/src/components/HeaderImage';
import NoticeBoardIcon from '@/assets/images/Notice-board-icon.svg';
import HomeSettingIcon from '@/assets/images/home-setting-icon.svg';
import ButtonStickerSvg from '@/assets/images/button-sticker.svg';
import ButtonStickerGreenSvg from '@/assets/images/button-sticker-green.svg';
import StarBlueSvg from '@/assets/images/star-blue.svg';
import StarYellowSvg from '@/assets/images/star-yellow.svg';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db, storage } from '@/src/firebase/config';

// ─── tokens ──────────────────────────────────────────────────────────────────
const C = {
  // Sunset-kitchen palette: warm walls + saturated fridge magnets.
  fridgeBg: "#F8F1E8",
  noteCream: "#FFF0D9",
  noteAlt: "#FFE8C6",
  noteText: "#2E0800",
  noteMeta: "#2E0800",
  noteLabel: "#2E0800",
  noteLines: "#F4D9BA",
  noteMargin: "#F19B8E",
  headerPlate: "#FFEFD2",
  headerBorder: "#D7B58A",
  magnetPurple: "#6C5CE7",
  magnetYellow: "#F9A825",
  magnetCoral: "#E17055",
  magnetMint: "#00B894",
  progressBg: "#EFD5B0",
};

// ─── helpers ──────────────────────────────────────────────────────────────────
function formatEventTime(ts: Timestamp): string {
  const d = ts.toDate();
  if (isToday(d)) return `Today · ${format(d, "h:mm a")}`;
  if (isTomorrow(d)) return `Tomorrow · ${format(d, "h:mm a")}`;
  return format(d, "MMM d · h:mm a");
}

// ─── Magnet ───────────────────────────────────────────────────────────────────
// Looks like a physical circular magnet with a shine highlight
function Magnet({ color }: { color: string }) {
  return (
    <View style={[styles.magnetBody, { backgroundColor: color }]}>
      {/* shine arc */}
      <View style={styles.magnetShine} />
      {/* center dimple */}
      <View style={[styles.magnetDimple, { backgroundColor: color + "AA" }]} />
    </View>
  );
}

// ─── Note card ────────────────────────────────────────────────────────────────
// Each card has a colored top strip that spans full width,
// with the magnet centered and overlapping the strip.
function Note({
  children,
  tilt,
  color,
  bg = '#FFFFFF',
  showMarginLine = false,
  foldCorner = false,
  hideStrip = false,
  hideMagnet = false,
  hideLines = false,
  stripLabel,
  stripContent,
  stripHeight,
  style,
}: {
  children: React.ReactNode;
  tilt?: "left" | "right" | "mild" | "steep";
  color: string;
  bg?: string;
  showMarginLine?: boolean;
  foldCorner?: boolean;
  hideStrip?: boolean;
  hideMagnet?: boolean;
  hideLines?: boolean;
  stripLabel?: string;
  stripContent?: React.ReactNode;
  stripHeight?: number;
  style?: object;
}) {
  const rotations = {
    left: "-1.8deg",
    right: "2.4deg",
    mild: "0.8deg",
    steep: "-3deg",
  };
  return (
    <View
      style={[
        styles.noteOuter,
        { transform: [{ rotate: tilt? rotations[tilt] : '0deg' }] },
        style,
      ]}
    >
      {/* colored top strip */}
      {!hideStrip && (
        <View style={[styles.noteStrip, { backgroundColor: color, justifyContent: 'center', paddingHorizontal: 12, ...(stripHeight ? { height: stripHeight } : {}) }]}>
          {stripContent ?? (stripLabel && <Text style={styles.stripLabelText}>{stripLabel}</Text>)}
        </View>
      )}
      {!hideStrip && !hideMagnet && !stripLabel && !stripContent && <View style={styles.magnetAnchor}><Magnet color={color} /></View>}
      {/* paper body */}
      <View style={[styles.notePaper, { backgroundColor: bg }]}>
        {/* red margin line on some cards */}
        {showMarginLine && <View style={styles.marginLine} />}
        {/* subtle ruled lines */}
        {!hideLines && [1,2,3,4,5].map((i) => (
          <View key={i} style={[styles.ruleLine, { top: `${i * (100/6)}%` as any }]} />
        ))}
        {children}
      </View>
      {/* folded corner triangle */}
      {foldCorner && <View style={styles.foldCorner} />}
    </View>
  );
}

// ─── Letter magnet tile ───────────────────────────────────────────────────────
// These are purely decorative — small plastic fridge letter tiles.
function LetterTile({
  char,
  color,
  rotate = "0deg",
  nudgeTop = 0,
}: {
  char: string;
  color: string;
  rotate?: string;
  nudgeTop?: number;
}) {
  return (
    <View style={{ marginTop: nudgeTop }}>
      <View
        style={[
          styles.letterTile,
          { backgroundColor: color, transform: [{ rotate }] },
        ]}
      >
        <View style={styles.letterTileShine} />
        <Text style={styles.letterChar}>{char}</Text>
      </View>
    </View>
  );
}

// ─── Emoji magnet (round) ─────────────────────────────────────────────────────
function EmojiMagnet({
  emoji,
  color,
  rotate = "0deg",
  size = 36,
}: {
  emoji: string;
  color: string;
  rotate?: string;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.emojiMagnet,
        {
          backgroundColor: color,
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{ rotate }],
        },
      ]}
    >
      <Text style={{ fontSize: size * 0.45 }}>{emoji}</Text>
    </View>
  );
}

function HomeDecor() {
  return (
    <View pointerEvents="none" style={styles.decorLayer}>
      <ButtonStickerSvg width={44} height={44} style={styles.decorButtonPeach} />
      <ButtonStickerGreenSvg width={44} height={44} style={styles.decorButtonGreen} />
    </View>
  );
}

function PhotoStars() {
  return (
    <View pointerEvents="none" style={styles.photoStars}>
      <StarBlueSvg width={61} height={61} style={styles.photoStarBlue} />
      <StarYellowSvg width={38} height={38} style={styles.photoStarYellow} />
    </View>
  );
}

function TapBadge({ color, label = "Tap" }: { color: string; label?: string }) {
  return (
    <View style={[styles.tapBadge, { borderColor: color + "66" }]}>
      <Text style={[styles.tapBadgeText, { color }]}>{label} →</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const memberMap = useHouseStore((s) => s.memberMap);
  const house = useHouseStore((s) => s.house);
  const userProfile = useAuthStore((s) => s.userProfile);
  const { chores: allChores = [], isLoading: choresLoading, toggleChore } = useChores();
  const { events: allEvents = [], isLoading: eventsLoading } =
    useCalendarEvents();
  const { items: allPantry = [], isLoading: pantryLoading } = usePantry();
  const { items: allShopping = [], isLoading: shoppingLoading } =
    useShoppingList();

  const weekKey = getWeekKey();
  const now = new Date();

  const chores = allChores;
  const doneCount = chores.filter((c) => c.isCompleted).length;

  const events = allEvents
    .filter((e) => e.startTime.toDate() > now)
    .sort(
      (a, b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime(),
    )
    .slice(0, 3);

  const expiring = allPantry.filter((item) => {
    if (!item.expirationDate) return false;
    const d = differenceInCalendarDays(item.expirationDate.toDate(), now);
    return d >= 0 && d <= 4;
  });

  const uncheckedCount = allShopping.filter((i) => !i.isChecked).length;

  function toTimeAgo(ts: { toDate(): Date }): string {
    const diff = Math.floor((Date.now() - ts.toDate().getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  }

  function memberInfo(userId: string) {
    const m = memberMap[userId];
    return {
      avatarColor: m?.color ?? '#C8B89A',
      avatarInitial: m?.displayName?.charAt(0).toUpperCase() ?? '?',
      avatarUrl: m?.avatarUrl ?? null,
    };
  }

  const rawActivities: { ts: number; boldText: string; message: string; avatarColor: string; avatarInitial: string; avatarUrl: string | null; timeAgo: string }[] = [];
  for (const item of allShopping) {
    if (!item.createdAt) continue;
    const mi = memberInfo(item.addedBy);
    rawActivities.push({ ts: item.createdAt.toMillis(), boldText: item.name, message: ' added to Shopping List', timeAgo: toTimeAgo(item.createdAt), ...mi });
  }
  for (const chore of allChores) {
    if (chore.completedAt && chore.completedBy) {
      const mi = memberInfo(chore.completedBy);
      rawActivities.push({ ts: chore.completedAt.toMillis(), boldText: chore.title, message: ' marked as done', timeAgo: toTimeAgo(chore.completedAt), ...mi });
    }
    if (chore.createdAt) {
      const mi = memberInfo(chore.createdBy);
      rawActivities.push({ ts: chore.createdAt.toMillis(), boldText: chore.title, message: ' added to Chores', timeAgo: toTimeAgo(chore.createdAt), ...mi });
    }
  }
  for (const event of allEvents) {
    if (!event.createdAt) continue;
    const mi = memberInfo(event.createdBy);
    rawActivities.push({ ts: event.createdAt.toMillis(), boldText: event.title, message: ' event created', timeAgo: toTimeAgo(event.createdAt), ...mi });
  }
  const recentActivities = rawActivities.sort((a, b) => b.ts - a.ts).slice(0, 3);

  const houseId = house?.id;
  const [uploading, setUploading] = useState(false);
  const [pictureLabel, setPictureLabel] = useState('');

  const pickAndUploadImage = async () => {
    if (!houseId) return;
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photo library.');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (result.canceled) return;
    setUploading(true);
    try {
      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `houses/${houseId}/pictureCard`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'houses', houseId), { pictureCardUrl: url, pictureCardUpdatedAt: serverTimestamp() });
    } catch (e) {
      console.error('[pictureCard] upload failed:', e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.safe}>
      <GridBackground />
      <View style={{ width: '100%', overflow: 'hidden' }}>
        <HeaderImage height={117} />
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerHouseName}>{house?.name ?? ''}</Text>
          <Text style={styles.headerUserName}>{userProfile?.displayName ?? ''}</Text>
        </View>
        <View style={styles.headerButtons}>
          <Pressable style={styles.headerIconButton} hitSlop={6} onPress={() => router.push('/(tabs)/noticeboard')}>
            <NoticeBoardIcon width={32} height={32} />
          </Pressable>
          <Pressable style={styles.headerIconButton} hitSlop={6} onPress={() => router.push('/(tabs)/settings')}>
            <HomeSettingIcon width={32} height={32} />
          </Pressable>
        </View>
      </View>
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <ScrollView
        style={styles.fridge}
        contentContainerStyle={styles.fridgeContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      >
        {/* ── Two independent columns ───────────────────────────────────────── */}
        <View style={styles.columnsContainer}>

          {/* Left column: Chores → Calendar → Shopping */}
          <View style={[styles.column, { paddingRight: 14 }]}>
            <Pressable
              onPress={() => router.push("/(tabs)/chores")}
              style={({ pressed }) => [styles.notePressable, styles.noteWide, pressed && styles.notePressablePressed]}
              hitSlop={6}
              accessibilityLabel="Chores"
              accessibilityHint="Tap to view and manage all chores"
            >
              <Note color={C.magnetPurple} hideStrip showMarginLine style={{ minHeight: 240 }}>
                {/* Card header */}
                <View style={styles.choreCardHeader}>
                  <Text style={styles.choreCardTitle}>My Chores</Text>
                </View>

                {choresLoading ? (
                  <Text style={styles.noteMeta}>Loading…</Text>
                ) : chores.length === 0 ? (
                  <Text style={styles.noteMeta}>Nothing today ✓</Text>
                ) : (
                  <>
                    {chores.slice(0, 4).map((c) => (
                      <Pressable
                        key={c.id}
                        style={styles.choreRowNew}
                        onPress={() => toggleChore(c.id, c.isCompleted)}
                      >
                        <View style={[styles.choreSquare, c.isCompleted && styles.choreSquareDone]}>
                          {c.isCompleted && <Ionicons name="checkmark" size={11} color="#fff" />}
                        </View>
                        <Text numberOfLines={1} style={[styles.choreItemText, c.isCompleted && styles.choreTextDone]}>
                          {c.title}
                        </Text>
                      </Pressable>
                    ))}
                    {chores.length > 4 && (
                      <Text style={styles.choreMoreText}>and {chores.length - 4} more…</Text>
                    )}
                  </>
                )}
              </Note>
            </Pressable>

            <Pressable
              onPress={() => router.push("/(tabs)/calendar")}
              style={({ pressed }) => [styles.notePressable, styles.noteWide, pressed && styles.notePressablePressed]}
              hitSlop={6}
              accessibilityLabel="Calendar"
              accessibilityHint="Tap to open the full calendar"
            >
              <Note color="#B5E2F1" stripContent={<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><CalendarIcon width={16} height={16} color="#2E0800" /><Text style={[styles.stripLabelText, { fontFamily: 'GowunBatang_700Bold' }]}>Next Event</Text></View>} hideLines stripHeight={38} style={{ minHeight: 150 }}>
                {eventsLoading ? (
                  <Text style={styles.noteMeta}>Loading…</Text>
                ) : events.length === 0 ? (
                  <Text style={styles.noteMeta}>No upcoming events</Text>
                ) : (
                  <View style={styles.eventRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.eventTitle} numberOfLines={1}>{events[0].title}</Text>
                      <Text style={styles.eventTime}>{formatEventTime(events[0].startTime)}</Text>
                    </View>
                  </View>
                )}
              </Note>
            </Pressable>

            <Pressable
              onPress={() => router.push("/(tabs)/shopping")}
              style={({ pressed }) => [styles.notePressable, styles.noteWide, pressed && styles.notePressablePressed]}
              hitSlop={6}
              accessibilityLabel="Shopping list"
              accessibilityHint="Tap to open and manage your shopping list"
            >
              <Note color={C.magnetMint} hideStrip hideLines style={{ minHeight: 190 }}>
                {/* Header */}
                <View style={styles.shopCardHeader}>
                  <Ionicons name="cart-outline" size={22} color={C.noteText} />
                  <Text style={styles.shopCardTitle}>Shopping List</Text>
                </View>

                {shoppingLoading ? (
                  <Text style={styles.noteMeta}>Loading…</Text>
                ) : allShopping.length === 0 ? (
                  <Text style={styles.noteMeta}>All stocked up!</Text>
                ) : (() => {
                  const unchecked = allShopping.filter((i) => !i.isChecked);
                  const shown = unchecked.slice(0, 3);
                  const remaining = unchecked.length - shown.length;
                  const estimatedTotal = unchecked.reduce((sum, i) => sum + (parseFloat(i.price ?? '0') || 0), 0);
                  return (
                    <>
                      <View style={styles.shopDivider} />
                      {shown.map((item) => (
                        <View key={item.id} style={styles.shopRow}>
                          <Text style={styles.shopItemText} numberOfLines={1}>
                            {item.quantity}x {item.name}
                          </Text>
                          <Text style={styles.shopDots} numberOfLines={1}>{'·'.repeat(30)}</Text>
                        </View>
                      ))}
                      {remaining > 0 && (
                        <View style={styles.shopRow}>
                          <Text style={[styles.shopItemText, { color: C.noteMeta }]}>and {remaining} other items</Text>
                        </View>
                      )}
                      <View style={styles.shopDivider} />
                      <Text style={styles.shopFooter}>Item count: {unchecked.length}</Text>
                      {estimatedTotal > 0 && (
                        <Text style={styles.shopFooter}>Estimated total: ${estimatedTotal.toFixed(0)}</Text>
                      )}
                    </>
                  );
                })()}
              </Note>
            </Pressable>
          </View>

          {/* Right column: Picture */}
          <View style={styles.column}>
            <View style={styles.photoCardWrap}>
              <Note color={C.magnetYellow} hideStrip hideLines style={{ minHeight: 260 }}>
                <Pressable
                  onPress={pickAndUploadImage}
                  style={{ alignSelf: 'stretch', height: 200, backgroundColor: '#2E0800', borderRadius: 0, marginTop: 0, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
                >
                  {house?.pictureCardUrl ? (
                    <Image source={{ uri: house.pictureCardUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <Ionicons name={uploading ? 'hourglass-outline' : 'image-outline'} size={32} color="#ffffff44" />
                  )}
                </Pressable>
                {house?.pictureCardUpdatedAt && (
                  <Text style={styles.pictureDateText}>
                    {format(house.pictureCardUpdatedAt.toDate(), 'dd,MM,yy')}
                  </Text>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 4 }}>
                  <TextInput
                    value={pictureLabel}
                    onChangeText={setPictureLabel}
                    style={[styles.noteTitle, { marginTop: 2, fontFamily: 'AlbertSans_700Bold', flexShrink: 1 }]}
                    placeholder="write here"
                    placeholderTextColor={C.noteMeta}
                    selectTextOnFocus
                  />
                  <Ionicons name="pencil-outline" size={14} color={C.noteMeta} style={{ marginTop: 2 }} />
                </View>
              </Note>
              <PhotoStars />
            </View>
            <View style={{ marginTop: 48, aspectRatio: 168 / 445, position: 'relative' }}>
              {/* Tilted background copy */}
              <RecentActivitySvg
                width="100%" height="100%"
                style={{ position: 'absolute', transform: [{ rotate: '6deg' }, { translateX: 40 }, { translateY: 20 }], zIndex: 0 }}
              />
              {/* Main SVG */}
              <RecentActivitySvg width="100%" height="100%" style={{ position: 'absolute', zIndex: 1 }} />

              {/* Notification overlays — boxes at ~16.7/18.5/20.2% left, tops at 6.7/30.8/54.8% */}
              {([
                [16.67, 6.74],
                [18.45, 30.79],
                [20.24, 54.83],
              ] as [number, number][]).map(([l, t], i) => {
                const notif = recentActivities[i];
                return (
                  <View
                    key={i}
                    style={{
                      position: 'absolute',
                      left: `${l}%`,
                      top: `${t}%`,
                      width: '59.52%',
                      height: '22.25%',
                      transform: [{ rotate: '-1.68deg' }],
                      padding: 8,
                      justifyContent: 'space-between',
                      zIndex: 2,
                    }}
                  >
                    {notif ? (
                      <>
                        <Text numberOfLines={2} style={{ fontFamily: 'AlbertSans_400Regular', fontSize: 11, color: '#2E0800', lineHeight: 16 }}>
                          <Text style={{ fontFamily: 'AlbertSans_700Bold' }}>{notif.boldText}</Text>
                          {notif.message}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          {notif.avatarUrl ? (
                            <Image source={{ uri: notif.avatarUrl }} style={{ width: 18, height: 18, borderRadius: 9 }} />
                          ) : (
                            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: notif.avatarColor, alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ fontFamily: 'AlbertSans_700Bold', fontSize: 8, color: '#fff' }}>{notif.avatarInitial}</Text>
                            </View>
                          )}
                          <Text style={{ fontFamily: 'AlbertSans_400Regular', fontSize: 10, color: '#2E0800' }}>{notif.timeAgo}</Text>
                        </View>
                      </>
                    ) : null}
                  </View>
                );
              })}

              {/* Icon */}
              <RecentActivityIcon width={180} height={180} style={{ position: 'absolute', top: -75, zIndex: 3, left: '-2%' }} />
            </View>
          </View>

        </View>

        <HomeDecor />
        <View style={{ height: 32 }} />
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.fridgeBg },
  fridge: { flex: 1, backgroundColor: 'transparent' },
  fridgeContent: { paddingHorizontal: 14, paddingBottom: 32, paddingTop: 24, position: 'relative' },
  decorLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    elevation: 30,
  },
  photoCardWrap: {
    position: 'relative',
    zIndex: 20,
    elevation: 20,
  },
  photoStars: {
    position: 'absolute',
    top: -30,
    right: -10,
    width: 92,
    height: 78,
    zIndex: 40,
    elevation: 40,
  },
  photoStarBlue: {
    position: 'absolute',
    top: 0,
    right: 20,
  },
  photoStarYellow: {
    position: 'absolute',
    top: 28,
    right: 0,
  },
  decorButtonPeach: {
    position: 'absolute',
    top: 370,
    right: 27,
  },
  decorButtonGreen: {
    position: 'absolute',
    top: 345,
    right: 11,
  },
  headerTextBlock: {
    position: 'absolute',
    bottom: 14,
    left: 36,
  },
  headerButtons: {
    position: 'absolute',
    bottom: 14,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerHouseName: {
    fontFamily: 'GowunBatang_700Bold',
    fontSize: 16,
    color: '#2E0800',
  },
  headerUserName: {
    fontFamily: 'GowunBatang_700Bold',
    fontSize: 28,
    color: '#2E0800',
  },

  // header
  fridgeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 4,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.headerBorder,
    shadowColor: "#7A4E2A",
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  houseName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2E0800",
    letterSpacing: -0.5,
  },
  houseDate: {
    fontSize: 12,
    color: C.noteMeta,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  avatarRow: { flexDirection: "row", gap: 6 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7A4E2A",
    shadowOpacity: 0.28,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  avatarInitial: { color: "#fff", fontWeight: "800", fontSize: 13 },

  // layout
  row: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginBottom: 20,
  },
  columnsContainer: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  column: { flex: 1 },
  noteWide: { marginBottom: 28 },
  noteHalf: { width: '50%', marginBottom: 20 },
  notePressable: {
    // Keep card movement subtle so it feels tactile, not jumpy.
    transform: [{ scale: 1 }],
  },
  notePressablePressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.93,
  },

  // ── Note card ──────────────────────────────────────────────────────────────
  noteOuter: {
    borderRadius: 3,
    overflow: "hidden",
    flexDirection: "column",
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 9,
    shadowOffset: { width: 2, height: 6 },
    elevation: 6,
  },
  noteStrip: {
    height: 30,
    // borderRadius handled by overflow:hidden on noteOuter
  },
  // absolute magnet that overlaps the strip
  magnetAnchor: {
    position: "absolute",
    top: 5, // (30px strip - 20px magnet) / 2 = 5
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  notePaper: {
    flex: 1,
    padding: 14,
    paddingTop: 16,
    position: "relative",
    overflow: "hidden",
  },
  // subtle horizontal ruled lines — purely decorative background detail
  ruleLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#B8D8F0',
  },
  // red left margin line (like composition paper)
  marginLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 28,
    width: 1,
    backgroundColor: C.noteMargin,
  },
  // folded corner illusion
  foldCorner: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderTopWidth: 18,
    borderRightWidth: 18,
    borderTopColor: "transparent",
    borderRightColor: C.fridgeBg + "CC",
  },

  // ── Magnet ──────────────────────────────────────────────────────────────────
  magnetBody: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "flex-end",
    justifyContent: "flex-start",
    paddingTop: 3,
    paddingRight: 3,
    shadowColor: "#000",
    shadowOpacity: 0.55,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 7,
  },
  magnetShine: {
    width: 6,
    height: 4,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  magnetDimple: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    top: 6,
    left: 6,
  },

  stripLabelText: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'AlbertSans_800ExtraBold',
    color: '#2E0800',
    letterSpacing: 0.2,
  },

  // ── Note typography ─────────────────────────────────────────────────────────
  noteLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: C.noteLabel,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: "800",
    fontFamily: 'AlbertSans_800ExtraBold',
    color: C.noteText,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  noteMeta: { fontSize: 12, color: C.noteMeta, marginTop: 2 },
  tapHint: {
    fontSize: 10,
    color: C.magnetMint,
    marginTop: 6,
    fontWeight: "600",
  },
  tapBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  tapBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  // ── Chores ──────────────────────────────────────────────────────────────────
  progressTrack: {
    height: 2,
    backgroundColor: '#DEEDEE',
    borderRadius: 1,
    marginBottom: 4,
    overflow: "hidden",
  },
  progressFill: { height: 2, backgroundColor: C.magnetPurple, borderRadius: 1 },
  progressLabel: { fontSize: 10, color: C.noteMeta, marginBottom: 8 },
  choreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 3,
    marginLeft: -6,
  },
  choreDot: { width: 7, height: 7, borderRadius: 3.5 },
  choreCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: C.magnetPurple,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  choreCheckboxDone: {
    backgroundColor: C.magnetPurple,
    borderColor: C.magnetPurple,
  },
  choreCheckmark: { fontSize: 10, color: '#fff', fontWeight: '800' },
  choreText: { fontSize: 12, color: C.noteText, flex: 1 },
  choreTextDone: { textDecorationLine: "line-through", color: C.noteLabel },

  // ── Chores card (new design) ─────────────────────────────────────────────────
  choreCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    marginLeft: 25,
  },
  choreCardTitle: {
    fontFamily: 'GowunBatang_700Bold',
    fontSize: 15,
    color: C.noteText,
  },
  choreDivider: {
    height: 1,
    backgroundColor: '#EDE8DE',
  },
  choreRowNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 40,
    paddingVertical: 9,
    marginLeft: -8,
  },
  choreSquare: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#A09080',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choreSquareDone: {
    backgroundColor: '#2D1A0E',
    borderColor: '#2D1A0E',
  },
  choreItemText: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 15,
    color: C.noteText,
    flex: 1,
    marginLeft: 8,
  },
  choreMoreText: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 12,
    color: C.noteMeta,
    marginTop: 8,
    marginLeft: 25,
  },
  pictureDateText: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 11,
    color: C.noteMeta,
    marginTop: 10,
  },

  // ── Shopping card (receipt style) ────────────────────────────────────────────
  shopCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  shopCardTitle: {
    fontFamily: 'GowunBatang_700Bold',
    fontSize: 15,
    color: C.noteText,
  },
  shopDivider: {
    height: 1,
    backgroundColor: '#D0C8BC',
    marginVertical: 6,
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    overflow: 'hidden',
    paddingVertical: 2,
  },
  shopItemText: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 12,
    color: C.noteText,
  },
  shopDots: {
    flex: 1,
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 12,
    color: C.noteLabel,
    marginLeft: 2,
    overflow: 'hidden',
  },
  shopFooter: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 11,
    color: C.noteText,
    marginTop: 2,
  },

  // ── Events ──────────────────────────────────────────────────────────────────
  eventRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#EDE8DC",
  },
  eventDot: { width: 7, height: 7, borderRadius: 3.5, marginTop: 4 },
  eventTitle: { fontFamily: 'AlbertSans_700Bold', fontSize: 14, color: C.noteText },
  eventTime: { fontFamily: 'AlbertSans_400Regular', fontSize: 12, color: C.noteMeta, marginTop: 1 },

  // ── Expiry chips ─────────────────────────────────────────────────────────────
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  expiryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFF",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  expiryChipUrgent: { backgroundColor: "#FFF0ED" },
  expiryName: { fontSize: 11, fontWeight: "600", color: C.noteText },
  expiryNameUrgent: { color: C.magnetCoral },
  expiryDays: { fontSize: 10, fontWeight: "800" },

  // ── Letter tiles (decorative) ────────────────────────────────────────────────
  letterTile: {
    width: 26,
    height: 30,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 3,
    shadowOffset: { width: 1, height: 3 },
    elevation: 5,
    overflow: "hidden",
  },
  letterTileShine: {
    position: "absolute",
    top: 2,
    left: 3,
    width: 10,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  letterChar: {
    fontSize: 14,
    fontWeight: "900",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // ── Emoji magnets (decorative) ───────────────────────────────────────────────
  emojiMagnet: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 1, height: 3 },
    elevation: 4,
  },

  // ── Filler layout ────────────────────────────────────────────────────────────
  fillerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 7,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  sideFillerCol: {
    alignItems: "center",
    gap: 6,
    paddingTop: 40,
    width: 44,
  },

  // ── Invite code (in header) ──────────────────────────────────────────────────
  inviteRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  inviteCodeText: { fontSize: 12, color: C.noteMeta },
  inviteCodeValue: { fontWeight: "800", letterSpacing: 2, color: C.noteText },
  inviteCopyAction: { fontSize: 12, fontWeight: "700", color: C.magnetCoral },
});
