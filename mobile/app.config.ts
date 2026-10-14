import type { ConfigContext, ExpoConfig } from 'expo/config';

/** Must match `constants/brand.ts` — keep inline so config eval never loads image requires. */
const APP_NAME = 'Sport IApperò';

/**
 * Native app identity for Sport IApperò.
 * Old builds used name "Oracle Sports" + package com.appero.oraclesports —
 * uninstall that APK; this one is com.appero.sportiappero @ 1.2.1.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const next = {
    ...config,
    name: APP_NAME,
    slug: 'sport-iappero',
    version: '1.2.1',
    orientation: 'portrait' as const,
    icon: './assets/images/icon.png',
    scheme: 'sportiappero',
    userInterfaceStyle: 'dark' as const,
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain' as const,
      backgroundColor: '#000000',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.appero.sportiappero',
    },
    android: {
      package: 'com.appero.sportiappero',
      versionCode: 8,
      // Launcher label (prebuild reads this even if typings omit it).
      label: APP_NAME,
      adaptiveIcon: {
        backgroundColor: '#DDF3E8',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
    },
    web: {
      bundler: 'metro' as const,
      output: 'static' as const,
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-font',
        {
          // Bundled natively so the fonts exist from the first frame. Loaded only
          // at runtime (useFonts), an Android release build can lay Text out with
          // the fallback font first and keep those narrow widths (clipped labels).
          // Family names = file names, matching constants/theme.ts.
          fonts: [
            './node_modules/@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf',
            './node_modules/@expo-google-fonts/dm-sans/500Medium/DMSans_500Medium.ttf',
            './node_modules/@expo-google-fonts/dm-sans/700Bold/DMSans_700Bold.ttf',
            './node_modules/@expo-google-fonts/bebas-neue/400Regular/BebasNeue_400Regular.ttf',
          ],
        },
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 280,
          resizeMode: 'contain',
          backgroundColor: '#000000',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      appName: APP_NAME,
    },
  };
  return next as ExpoConfig;
};
