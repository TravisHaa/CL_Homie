import { CHORE_THEME } from '@/src/theme/chores';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface AssignmentTileProps {
  label: string;
  initial?: string;
  color?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  onPress: () => void;
}

export function AssignmentTile({
  label,
  initial,
  color,
  iconName,
  selected,
  onPress,
}: AssignmentTileProps) {
  return (
    <TouchableOpacity
      style={styles.tile}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.circle,
          { backgroundColor: color || CHORE_THEME.cardBg },
          selected && styles.circleSelected,
        ]}
      >
        {iconName ? (
          <Ionicons name={iconName} size={22} color={CHORE_THEME.text} />
        ) : (
          <Text style={styles.initial}>{initial ?? '?'}</Text>
        )}
      </View>
      <Text
        style={[styles.label, selected && styles.labelSelected]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 64,
    alignItems: 'center',
  },
  circle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  circleSelected: {
    borderColor: CHORE_THEME.accent,
  },
  initial: {
    fontSize: 18,
    fontFamily: 'AlbertSans_700Bold',
    color: CHORE_THEME.onAccent,
  },
  label: {
    fontSize: 12,
    color: '#7A6652',
    marginTop: 4,
    fontFamily: 'AlbertSans_500Medium',
    textAlign: 'center',
  },
  labelSelected: {
    color: '#2D1A0E',
    fontFamily: 'AlbertSans_700Bold',
  },
});
