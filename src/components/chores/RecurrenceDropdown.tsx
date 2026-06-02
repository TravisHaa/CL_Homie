import { CHORE_THEME } from '@/src/theme/chores';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
    <View style={[styles.wrapper, open && styles.wrapperOpen]}>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen((o) => !o)}
        activeOpacity={0.7}
      >
        <Text style={styles.triggerText}>{current?.label ?? ''}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={CHORE_THEME.text}
        />
      </TouchableOpacity>

      {open && (
        <Pressable
          onPress={() => setOpen(false)}
          style={styles.backdrop}
          // Catches taps anywhere on the sheet to close the menu without
          // visually obscuring anything (transparent).
        />
      )}

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
                    <Ionicons name="checkmark" size={14} color={CHORE_THEME.accent} />
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
  wrapper: {
    position: 'relative',
    zIndex: 1,
    alignSelf: 'flex-start',
  },
  wrapperOpen: {
    // Raise the entire dropdown above sibling form rows when open so the
    // floating menu paints over them on web/iOS. `elevation` on the menu
    // itself handles Android stacking.
    zIndex: 1000,
  },
  backdrop: {
    // Cover the entire bottom sheet with a transparent layer so taps
    // outside the menu close it. Large negative offsets make this work
    // even though the parent wrapper has `alignSelf: 'flex-start'`.
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
    color: CHORE_THEME.text,
    fontWeight: '600',
  },
  menu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 8,
    minWidth: 180,
    backgroundColor: CHORE_THEME.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CHORE_THEME.hairline,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 1000,
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
    color: CHORE_THEME.textMuted,
    fontWeight: '500',
  },
  menuItemTextSelected: {
    color: CHORE_THEME.text,
    fontWeight: '700',
  },
});
