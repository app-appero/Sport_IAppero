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
        name="football"
        options={{
          title: 'Football',
          tabBarIcon: ({ color }) => <TabIcon label="FB" color={color} />,
        }}
      />
      <Tabs.Screen
        name="tennis"
        options={{
          title: 'Tennis',
          tabBarIcon: ({ color }) => <TabIcon label="TN" color={color} />,
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color }) => <TabIcon label="SV" color={color} />,
        }}
      />
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}
