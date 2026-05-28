import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { PALETTE, SPACING, TYPE } from '@/src/theme/palette';

type Size = 'hero' | 'title' | 'section';

type Props = {
  title: string;
  subtitle?: string;
  size?: Size;
  onBack?: () => void;
  right?: React.ReactNode;
};

const TITLE_STYLE: Record<Size, object> = {
  hero: TYPE.header,
  title: TYPE.title,
  section: TYPE.heading,
};

/** V3 screen header — Gowun Batang title, optional back arrow + right action. */
export function ScreenHeader({ title, subtitle, size = 'title', onBack, right }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {onBack ? (
          <Pressable accessibilityLabel="Go back" hitSlop={10} onPress={onBack} style={styles.back}>
            <Ionicons name="chevron-back" size={26} color={PALETTE.ink} />
          </Pressable>
        ) : null}
        <Text style={[TITLE_STYLE[size], styles.title]} numberOfLines={1}>
          {title}
        </Text>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.xs, paddingVertical: SPACING.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  back: { marginLeft: -4 },
  title: { color: PALETTE.ink, flex: 1 },
  right: { marginLeft: 'auto' },
  subtitle: { ...TYPE.small, color: PALETTE.inkMuted },
});
