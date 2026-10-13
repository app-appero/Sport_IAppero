import {
  BebasNeue_400Regular,
  useFonts as useBebas,
} from '@expo-google-fonts/bebas-neue';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
  useFonts as useDmSans,
} from '@expo-google-fonts/dm-sans';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { BootSplash } from '@/components/BootSplash';
import { AuthProvider } from '@/hooks/auth';
import { defaultPalette as colors } from '@/constants/theme';
import { CACHE_MAX_AGE_MS, createQueryClient, queryPersister } from '@/services/queryClient';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync().catch(() => {
  /* already hidden */
});

export default function RootLayout() {
  const [bebasLoaded, bebasError] = useBebas({ BebasNeue_400Regular });
  const [dmLoaded, dmError] = useDmSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });
  // A failed font load must not leave the app blank: fall back to system fonts.
  const fontsReady = (bebasLoaded || !!bebasError) && (dmLoaded || !!dmError);
  const [bootDone, setBootDone] = useState(false);

  useEffect(() => {
    if (!fontsReady) return;
    let cancelled = false;
    (async () => {
      try {
        await SplashScreen.hideAsync();
      } catch {
        /* ignore */
      }
      // Keep branded frame briefly so cold start always shows the splash art.
      await new Promise((r) => setTimeout(r, 700));
      if (!cancelled) setBootDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [fontsReady]);

  const [queryClient] = useState(createQueryClient);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: CACHE_MAX_AGE_MS,
        // Only successful results are worth showing as an offline snapshot.
        dehydrateOptions: { shouldDehydrateQuery: (q) => q.state.status === 'success' },
      }}
    >
      <StatusBar style="light" />
      {/*
        Mount the app only once the fonts are registered. On Android, Text laid out
        with the fallback font keeps that (narrower) width after the custom font
        arrives, so labels came out clipped ("Cal…", "Tut", "SportIAppe") until a
        re-render. The native splash stays up until then, so nothing flashes.
      */}
      {fontsReady ? (
      <AuthProvider>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.surface },
          headerStyle: { backgroundColor: colors.surfaceElevated },
          headerTintColor: colors.ink,
          headerTitleStyle: { color: colors.ink },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="prediction/[id]"
          options={{
            title: 'Predizione',
            headerBackTitle: 'Indietro',
          }}
        />
        <Stack.Screen
          name="profilo"
          options={{
            title: 'Profilo',
            headerBackTitle: 'Indietro',
          }}
        />
        <Stack.Screen
          name="storico"
          options={{
            title: 'Storico',
            headerBackTitle: 'Indietro',
          }}
        />
        <Stack.Screen
          name="event/[id]"
          options={{
            title: 'Evento',
            headerBackTitle: 'Indietro',
          }}
        />
      </Stack>
      </AuthProvider>
      ) : null}
      {fontsReady && !bootDone ? <BootSplash /> : null}
    </PersistQueryClientProvider>
  );
}
