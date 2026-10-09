import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radii, spacing } from '@/constants/theme';

const STATUS_COPY: Record<string, string> = {
  degraded: 'parzialmente disponibile',
  unavailable: 'non disponibile',
  empty: 'senza eventi oggi',
  error: 'in errore',
  timeout: 'in timeout',
};

export function ProviderWarning({
  status,
  provider,
}: {
  status?: string;
  provider?: string;
}) {
  if (!status || status === 'ok') return null;
  const label = STATUS_COPY[status] ?? status;
  return (
    <View style={styles.wrap} accessibilityRole="text">
      <Text style={styles.text}>
        {provider ?? 'Provider'} {label}. I dati sotto possono essere incompleti.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.warnBg,
    borderColor: colors.warning,
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  text: { fontFamily: fonts.bodyMedium, color: colors.warning, fontSize: 13 },
});
