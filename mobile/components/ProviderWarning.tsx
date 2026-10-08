import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, spacing } from '@/constants/theme';

export function ProviderWarning({
  status,
  provider,
}: {
  status?: string;
  provider?: string;
}) {
  if (!status || status === 'ok') return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>
        {provider ?? 'Provider'} temporarily unavailable ({status})
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#FFF4CE',
    borderColor: '#E6C200',
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: spacing.sm,
  },
  text: { fontFamily: fonts.bodyMedium, color: colors.warning, fontSize: 13 },
});
