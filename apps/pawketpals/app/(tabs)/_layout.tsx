import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1F3B57',
        tabBarInactiveTintColor: '#6A7B87',
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#E6DBC8' }
      }}
    >
      <Tabs.Screen name="park" options={{ title: 'Park' }} />
      <Tabs.Screen name="pals" options={{ title: 'Pals' }} />
      <Tabs.Screen name="town" options={{ title: 'Town' }} />
      <Tabs.Screen name="share" options={{ title: 'Share' }} />
      <Tabs.Screen name="events" options={{ title: 'Events' }} />
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
