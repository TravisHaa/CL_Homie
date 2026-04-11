import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; icon: IconName; activeIcon: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { name: 'chores', title: 'Chores', icon: 'checkmark-circle-outline', activeIcon: 'checkmark-circle' },
  { name: 'calendar', title: 'Calendar', icon: 'calendar-outline', activeIcon: 'calendar' },
  { name: 'pantry', title: 'Pantry', icon: 'nutrition-outline', activeIcon: 'nutrition' },
  { name: 'shopping', title: 'Shopping', icon: 'cart-outline', activeIcon: 'cart' },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2D3436',
        tabBarInactiveTintColor: '#B2BEC3',
        tabBarStyle: {
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          backgroundColor: '#FFFBF5',
          paddingBottom: 8,
          height: 60,
        },
        headerStyle: { backgroundColor: '#FFFBF5' },
        headerShadowVisible: false,
      }}
    >
      {TABS.map(({ name, title, icon, activeIcon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? activeIcon : icon} size={24} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
