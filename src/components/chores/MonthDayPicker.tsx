import { CHORE_THEME } from '@/src/theme/chores';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const WEEKDAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
// 31 days padded to a 5x7 = 35 cell grid.
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const PAD = Array.from({ length: 35 - 31 }, (_, i) => `pad-${i}`);

interface MonthDayPickerProps {
  value: number; // 1..31
  onChange: (n: number) => void;
}

// In-flow expanding day-of-month picker. The 1..31 grid is a visual aid only
// — the value semantically is "Nth day of every month", clamped to the last
// day of short months at runtime by the schedule logic.
export function MonthDayPicker({ value, onChange }: MonthDayPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.wrapper, open && styles.wrapperOpen]}>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen((o) => !o)}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={14} color={CHORE_THEME.text} />
        <Text style={styles.triggerText}>Day {value}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={CHORE_THEME.text}
        />
      </TouchableOpacity>

      {open && (
        <Pressable onPress={() => setOpen(false)} style={styles.backdrop} />
      )}

      {open && (
        <View style={styles.menu}>
          <View style={styles.headerRow}>
            {WEEKDAY_HEADERS.map((h, i) => (
              <Text key={`${h}-${i}`} style={styles.headerCell}>
                {h}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {DAYS.map((d) => {
              const selected = d === value;
              return (
                <TouchableOpacity
                  key={d}
                  style={styles.cell}
                  onPress={() => {
                    onChange(d);
                    setOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.cellInner, selected && styles.cellInnerSelected]}>
                    <Text
                      style={[styles.cellText, selected && styles.cellTextSelected]}
                    >
                      {d}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            {PAD.map((k) => (
              <View key={k} style={styles.cell} />
            ))}
          </View>

          {value > 28 && (
            <Text style={styles.hint}>
              * Clamped to the last day in months with fewer than {value} days.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const CELL_SIZE = 34;

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 1,
    alignSelf: 'flex-start',
  },
  wrapperOpen: {
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: -2000,
    bottom: -2000,
    left: -2000,
    right: -2000,
    zIndex: 999,
  },
  trigger: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: CHORE_THEME.cardBg,
    borderWidth: 1,
    borderColor: CHORE_THEME.hairline,
  },
  triggerText: {
    fontSize: 14,
    color: '#2D1A0E',
    fontFamily: 'AlbertSans_600SemiBold',
  },
  menu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 8,
    backgroundColor: CHORE_THEME.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CHORE_THEME.hairline,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 1000,
  },
  headerRow: {
    flexDirection: 'row',
  },
  headerCell: {
    width: CELL_SIZE,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: 'AlbertSans_700Bold',
    color: '#7A6652',
    marginBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: CELL_SIZE * 7,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellInner: {
    width: CELL_SIZE - 6,
    height: CELL_SIZE - 6,
    borderRadius: (CELL_SIZE - 6) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellInnerSelected: {
    backgroundColor: CHORE_THEME.accent,
  },
  cellText: {
    fontSize: 13,
    fontFamily: 'AlbertSans_400Regular',
    color: '#2D1A0E',
  },
  cellTextSelected: {
    color: CHORE_THEME.onAccent,
    fontFamily: 'AlbertSans_700Bold',
  },
  hint: {
    fontSize: 11,
    fontFamily: 'AlbertSans_400Regular',
    color: '#7A6652',
    marginTop: 6,
    maxWidth: CELL_SIZE * 7,
  },
});
