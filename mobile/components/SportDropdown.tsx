import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, spacing } from '@/constants/theme';

export type SportId = 'football' | 'tennis';

const OPTIONS: { label: string; value: SportId }[] = [
  { label: 'Calcio', value: 'football' },
  { label: 'Tennis', value: 'tennis' },
];

type Props = {
  value: SportId;
  onChange: (value: SportId) => void;
};

export function SportDropdown({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];

  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.trigger}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Seleziona sport"
      >
        <Text style={styles.triggerLabel} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {current.label}
        </Text>
        <Text style={styles.chevron} maxFontSizeMultiplier={1.2}>
          ▾
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.menu}>
            {OPTIONS.map((opt) => {
              const active = opt.value === value;
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.sm,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    gap: 12,
  },
  // flexShrink:0 — Android APK otherwise compresses Text in a row (shows "Calci").
  triggerLabel: {
    flexGrow: 1,
    flexShrink: 0,
    fontFamily: fonts.bodyBold,
    color: colors.ink,
    fontSize: 16,
    // Custom fonts on Android often clip the last glyph without a little padding.
    paddingRight: 4,
    includeFontPadding: false,
  },
  chevron: {
    flexShrink: 0,
    fontFamily: fonts.bodyBold,
    color: colors.inkMuted,
    fontSize: 16,
    paddingLeft: 4,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  menu: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: 48,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  optionActive: { backgroundColor: colors.accent },
  optionText: { fontFamily: fonts.bodyMedium, color: colors.ink, fontSize: 16 },
  optionTextActive: { color: colors.onAccent, fontFamily: fonts.bodyBold },
});
