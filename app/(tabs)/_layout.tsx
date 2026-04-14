import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type TabTheme = {
  headerBg: string;
  headerTint: string;
  tabActive: string;
};

const TABS: { name: string; title: string; icon: IconName; activeIcon: IconName }[] = [
  { name: 'index', title: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { name: 'pantry', title: 'Pantry', icon: 'nutrition-outline', activeIcon: 'nutrition' },
  { name: 'shopping', title: 'Shopping', icon: 'cart-outline', activeIcon: 'cart' },
  { name: 'settings', title: 'Settings', icon: 'settings-outline', activeIcon: 'settings' },
];

const HIDDEN = ['chores', 'calendar', 'two'];
const TAB_THEME: Record<string, TabTheme> = {
  index: { headerBg: '#FFE3B8', headerTint: '#4A2C1A', tabActive: '#A7572D' },
  pantry: { headerBg: '#DDF4E7', headerTint: '#154D37', tabActive: '#1B8F63' },
  shopping: { headerBg: '#FFE9DA', headerTint: '#5A2D18', tabActive: '#C15B2A' },
  settings: { headerBg: '#EDE9FF', headerTint: '#32246C', tabActive: '#6557C8' },
};

export default function TabLayout() {
  return (
    <Tabs
      // Route-aware nav theming keeps each screen distinct but still cohesive.
      screenOptions={({ route }) => {
        const theme = TAB_THEME[route.name] ?? TAB_THEME.index;
        return {
          tabBarActiveTintColor: theme.tabActive,
          tabBarInactiveTintColor: '#B38D71',
          tabBarStyle: {
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            backgroundColor: '#FFEFD2',
            paddingBottom: 8,
            height: 60,
          },
          // Blend top route headers with each tab's visual language.
          headerStyle: { backgroundColor: theme.headerBg },
          headerTintColor: theme.headerTint,
          headerTitleStyle: { fontWeight: '800', letterSpacing: 0.2 },
          headerShadowVisible: false,
        };
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
      {HIDDEN.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
