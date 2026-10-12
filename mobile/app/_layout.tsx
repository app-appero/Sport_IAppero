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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { BootSplash } from '@/components/BootSplash';
import { defaultPalette as colors } from '@/constants/theme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync().catch(() => {
  /* already hidden */
});

export default function RootLayout() {
  const [bebasLoaded] = useBebas({ BebasNeue_400Regular });
  const [dmLoaded] = useDmSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });
  const fontsReady = bebasLoaded && dmLoaded;
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

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.surface },
          headerStyle: { backgroundColor: colors.surfaceElevated },
          headerTintColor: colors.ink,
          headerTitleStyle: { color: colors.ink },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="prediction/[id]" options={{ headerShown: false }} />
        <Stack.Screen
          name="event/[id]"
          options={{
            title: 'Evento',
            headerBackTitle: 'Indietro',
          }}
        />
      </Stack>
      {!bootDone ? <BootSplash /> : null}
    </QueryClientProvider>
  );
}
