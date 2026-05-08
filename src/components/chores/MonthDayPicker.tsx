import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const CH = {
  plateBg: '#FFE2CB',
  plateBorder: '#F4BA93',
  textStrong: '#5A2F1A',
  textSoft: '#946345',
  fill: '#D97745',
  white: '#FFFFFF',
};

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
    <View>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen((o) => !o)}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={14} color={CH.textStrong} />
        <Text style={styles.triggerText}>Day {value}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={CH.textStrong}
        />
      </TouchableOpacity>

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
  trigger: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: CH.plateBg,
    borderWidth: 1,
    borderColor: CH.plateBorder,
  },
  triggerText: {
    fontSize: 14,
    color: CH.textStrong,
    fontWeight: '600',
  },
  menu: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: CH.plateBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CH.plateBorder,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
  },
  headerCell: {
    width: CELL_SIZE,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: CH.textSoft,
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
    backgroundColor: CH.fill,
  },
  cellText: {
    fontSize: 13,
    color: CH.textStrong,
  },
  cellTextSelected: {
    color: CH.white,
    fontWeight: '700',
  },
  hint: {
    fontSize: 11,
    color: CH.textSoft,
    marginTop: 6,
    maxWidth: CELL_SIZE * 7,
  },
});
