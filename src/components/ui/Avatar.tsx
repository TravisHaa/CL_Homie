import { Image, StyleSheet, Text, View } from 'react-native';

import { FONTS, PALETTE } from '@/src/theme/palette';

export function initialsOf(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const s = (parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '');
  return s.toUpperCase() || '?';
}

type Props = {
  name?: string | null;
  uri?: string | null;
  color?: string;
  size?: number;
};

/** Round avatar — image if provided, else colored initials. */
export function Avatar({ name, uri, color = PALETTE.teal, size = 40 }: Props) {
  const dim = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={[dim, styles.img]} />;
  return (
    <View style={[dim, styles.fallback, { backgroundColor: color }]}>
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initialsOf(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  img: { backgroundColor: PALETTE.sand },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: PALETTE.onAction, fontFamily: FONTS.bodySemiBold },
});
