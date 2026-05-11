import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const CH = {
  plateBg: '#FFE2CB',
  plateBorder: '#F4BA93',
  textStrong: '#5A2F1A',
  textSoft: '#946345',
  fill: '#D97745',
  white: '#FFFFFF',
};

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
          { backgroundColor: color || CH.plateBg },
          selected && styles.circleSelected,
        ]}
      >
        {iconName ? (
          <Ionicons name={iconName} size={22} color={CH.textStrong} />
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
    borderColor: CH.fill,
  },
  initial: {
    fontSize: 18,
    fontWeight: '700',
    color: CH.white,
  },
  label: {
    fontSize: 12,
    color: CH.textSoft,
    marginTop: 4,
    fontWeight: '500',
    textAlign: 'center',
  },
  labelSelected: {
    color: CH.textStrong,
    fontWeight: '700',
  },
});
