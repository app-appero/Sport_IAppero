import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/components/SportTheme';
import { fonts, spacing, type Palette, fs } from '@/constants/theme';

export default function NotFoundScreen() {
  const styles = useThemedStyles(makeStyles);
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Screen not found</Text>
        <Link href="/football" style={styles.link}>
          <Text style={styles.linkText}>Go to Football</Text>
        </Link>
      </View>
    </>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  title: { fontFamily: fonts.bodyBold, fontSize: fs(20), color: colors.ink },
  link: { marginTop: spacing.sm },
  linkText: { fontFamily: fonts.bodyMedium, color: colors.accentText, fontSize: fs(16) },
});
