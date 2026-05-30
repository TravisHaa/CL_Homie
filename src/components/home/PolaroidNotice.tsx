/**
 * PolaroidNotice — Figma node 2694:26968 ("polaroid notice widget").
 *
 * White polaroid frame on the home dashboard. The photo area is currently a
 * cream-tinted empty state with a camera icon + "Tap to add a memory" hint;
 * underneath sits a caption row with today's date, a one-line status, and an
 * edit pencil.
 *
 * Pure presentational — no props, no Firestore wiring yet. The whole frame is
 * a Pressable so it can later launch the image picker.
 */
import { format } from 'date-fns';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FONTS, PALETTE, SHADOWS, SPACING } from '@/src/theme/palette';

// Fixed dimensions from Figma (node 2694:26968).
const FRAME_WIDTH = 167;
const FRAME_HEIGHT = 230;
const FRAME_PADDING = 12;

export default function PolaroidNotice() {
  // TODO: wire to Firebase Storage + expo-image-picker so tapping the frame
  // opens the picker and uploads the chosen photo as the house's daily memo.
  const handlePress = () => {};

  const dateLabel = format(new Date(), 'M.d.yy');

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.frame, pressed && styles.framePressed]}
      accessibilityRole="button"
      accessibilityLabel="Add a memory"
    >
      {/* Photo area — cream-tinted empty state with inner shadow. */}
      <View style={styles.imageArea}>
        <View style={styles.placeholder}>
          <MaterialCommunityIcons
            name="camera-plus-outline"
            size={32}
            color={PALETTE.inkMuted}
          />
          <Text style={styles.placeholderHint}>Tap to add a memory</Text>
        </View>
        {/* Inset shadow overlay — RN can't do true inset shadows, so we
            approximate with a hairline border that matches the documented
            inner-shadow color at full strength. */}
        <View pointerEvents="none" style={styles.innerShadow} />
      </View>

      {/* Caption row — date on top, status + edit icon on bottom. */}
      <View style={styles.caption}>
        <Text style={styles.captionText}>{dateLabel}</Text>
        <View style={styles.statusRow}>
          <Text style={styles.captionText}>all quiet :)</Text>
          <Ionicons
            name="pencil-outline"
            size={14}
            color={PALETTE.inkMuted}
          />
        </View>
      </View>
    </Pressable>
  );
}

const PHOTO_WIDTH = FRAME_WIDTH - FRAME_PADDING * 2; // 143, matches Figma.

const styles = StyleSheet.create({
  frame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    backgroundColor: PALETTE.white,
    padding: FRAME_PADDING,
    alignItems: 'center',
    gap: SPACING.sm,
    ...SHADOWS.card,
  },
  framePressed: {
    opacity: 0.92,
  },
  imageArea: {
    flex: 1,
    width: PHOTO_WIDTH,
    backgroundColor: PALETTE.field, // #FFF8F1 — closest cream to imgMango backdrop
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerShadow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(64, 48, 33, 0.33)',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  placeholderHint: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 11,
    color: PALETTE.inkMuted,
    textAlign: 'center',
  },
  caption: {
    width: PHOTO_WIDTH,
    height: 34,
    gap: SPACING.xs,
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  captionText: {
    fontFamily: FONTS.bodyRegular,
    fontSize: 12,
    color: PALETTE.ink,
  },
});
