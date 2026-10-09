import { Tabs } from 'expo-router';

/** No bottom tab bar — sport dropdown + header "Salvati". */
export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none', height: 0, overflow: 'hidden' },
        tabBarItemStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="football" options={{ href: null }} />
      <Tabs.Screen name="tennis" options={{ href: null }} />
      <Tabs.Screen name="saved" />
    </Tabs>
  );
}
