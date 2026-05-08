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

export interface DropdownOption<V extends string> {
  label: string;
  value: V;
}

interface RecurrenceDropdownProps<V extends string> {
  value: V;
  options: DropdownOption<V>[];
  onChange: (v: V) => void;
}

// In-flow expanding dropdown used inside a BottomSheetScrollView.
// We deliberately avoid absolute positioning so nothing is clipped by the
// scroll container on native; the list pushes content down while open.
export function RecurrenceDropdown<V extends string>({
  value,
  options,
  onChange,
}: RecurrenceDropdownProps<V>) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <View>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen((o) => !o)}
        activeOpacity={0.7}
      >
        <Text style={styles.triggerText}>{current?.label ?? ''}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={CH.textStrong}
        />
      </TouchableOpacity>

      {open && (
        <View style={styles.menu}>
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={styles.menuItem}
                onPress={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.checkSlot}>
                  {selected && (
                    <Ionicons name="checkmark" size={14} color={CH.textStrong} />
                  )}
                </View>
                <Text
                  style={[styles.menuItemText, selected && styles.menuItemTextSelected]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

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
    minWidth: 180,
    backgroundColor: CH.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CH.plateBorder,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  checkSlot: {
    width: 16,
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 14,
    color: CH.textSoft,
    fontWeight: '500',
  },
  menuItemTextSelected: {
    color: CH.textStrong,
    fontWeight: '700',
  },
});
