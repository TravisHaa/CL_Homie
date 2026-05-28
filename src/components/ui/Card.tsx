import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { PALETTE, RADIUS, SHADOWS, SPACING } from '@/src/theme/palette';

type Tone = 'white' | 'cream' | 'sand' | 'teal';

const TONE_BG: Record<Tone, string> = {
  white: PALETTE.white,
  cream: PALETTE.cream,
  sand: PALETTE.sand,
  teal: PALETTE.tealTint,
};

type Props = {
  children: React.ReactNode;
  tone?: Tone;
  onPress?: () => void;
  flat?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** V3 surface card — rounded, soft shadow, padded. */
export function Card({ children, tone = 'white', onPress, flat = false, style }: Props) {
  const content = (
    <View
      style={[
        styles.card,
        { backgroundColor: TONE_BG[tone] },
        !flat && SHADOWS.card,
        style,
      ]}
    >
      {children}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.xl, padding: SPACING.base },
  pressed: { opacity: 0.85 },
});
