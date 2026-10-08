import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, spacing } from '@/constants/theme';

export default function SavedTab() {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#E7F2E4', colors.surface]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Text style={styles.brand}>ORACLE SPORTS</Text>
        <Text style={styles.title}>Saved</Text>
        <Text style={styles.body}>
          Preferiti e follow arriveranno con login. Per ora è un placeholder intenzionale.
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  safe: { flex: 1, padding: spacing.lg, gap: spacing.sm },
  brand: {
    fontFamily: fonts.display,
    fontSize: 42,
    color: colors.brand,
    letterSpacing: 1,
  },
  title: { fontFamily: fonts.bodyBold, fontSize: 22, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 15, color: colors.inkMuted, lineHeight: 22 },
});
