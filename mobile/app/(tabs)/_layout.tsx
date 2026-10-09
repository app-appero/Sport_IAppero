import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';

import { colors, fonts } from '@/constants/theme';

function TabIcon({ label, color }: { label: string; color: ColorValue }) {
  return (
    <Text style={{ color, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.3 }}>
      {label}
    </Text>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: {
          backgroundColor: colors.surfaceElevated,
          borderTopColor: colors.line,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.bodyMedium,
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Partite',
          tabBarIcon: ({ color }) => <TabIcon label="PT" color={color} />,
        }}
      />
      {/* Legacy routes kept for deep links; hidden from tab bar. */}
      <Tabs.Screen name="football" options={{ href: null }} />
      <Tabs.Screen name="tennis" options={{ href: null }} />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Salvati',
          tabBarIcon: ({ color }) => <TabIcon label="SV" color={color} />,
        }}
      />
    </Tabs>
  );
}
