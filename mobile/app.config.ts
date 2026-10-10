import type { ExpoConfig, ConfigContext } from 'expo/config';

/** Must match `constants/brand.ts` — keep inline so config eval never loads image requires. */
const APP_NAME = 'Sport IApperò';

/**
 * Native app identity for Sport IApperò.
 * Old builds used name "Oracle Sports" + package com.appero.oraclesports —
 * uninstall that APK; this one is com.appero.sportiappero @ 1.1.0.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_NAME,
  slug: 'sport-iappero',
  version: '1.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'sportiappero',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/images/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#050A14',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.appero.sportiappero',
  },
  android: {
    package: 'com.appero.sportiappero',
    label: APP_NAME,
    versionCode: 3,
    adaptiveIcon: {
      backgroundColor: '#050A14',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash.png',
        imageWidth: 320,
        resizeMode: 'contain',
        backgroundColor: '#050A14',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    appName: APP_NAME,
  },
});
