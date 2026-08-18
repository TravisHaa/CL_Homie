import { Tabs } from 'expo-router';
import CalendarIcon from '@/assets/images/CalendarIcon.svg';
import HomeIcon from '@/assets/images/HomeIcon.svg';
import PantryIcon from '@/assets/images/PantryIcon.svg';
import ShoppingIcon from '@/assets/images/ShoppingIcon.svg';

type TabTheme = {
  headerBg: string;
  headerTint: string;
  tabActive: string;
};

const TABS: { name: string; title: string; Icon: React.FC<{ width: number; height: number; color?: string }> }[] = [
  { name: 'index', title: 'Home', Icon: HomeIcon },
  { name: 'calendar', title: 'Calendar', Icon: CalendarIcon },
  { name: 'pantry', title: 'Pantry', Icon: PantryIcon },
  { name: 'shopping', title: 'Shopping', Icon: ShoppingIcon },
];

const HIDDEN = ['chores', 'two', 'house', 'settings'];
const TAB_THEME: Record<string, TabTheme> = {
  index: { headerBg: '#FFE3B8', headerTint: '#4A2C1A', tabActive: '#A7572D' },
  calendar: { headerBg: '#EEF4FF', headerTint: '#2D3D72', tabActive: '#5E7CE2' },
  pantry: { headerBg: '#DDF4E7', headerTint: '#154D37', tabActive: '#1B8F63' },
  shopping: { headerBg: '#FFE9DA', headerTint: '#5A2D18', tabActive: '#C15B2A' },
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
      {TABS.map(({ name, title, Icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color }) => (
              <Icon width={24} height={24} color={color} />
            ),
          }}
        />
      ))}
      {HIDDEN.map((name) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            href: null,
            // Chores has its own in-screen header in the cream/teal redesign;
            // showing the default peach native header above it would clash.
            ...(name === 'chores' ? { headerShown: false } : {}),
          }}
        />
      ))}
    </Tabs>
  );
}
