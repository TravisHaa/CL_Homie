import { HomeHeader } from '@/src/components/HomeHeader';
import { Tabs } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  pantry: { headerBg: '#DDF4E7', headerTint: '#154D37', tabActive: '#1B8F63' },
  shopping: { headerBg: '#FFE9DA', headerTint: '#5A2D18', tabActive: '#C15B2A' },
  settings: { headerBg: '#EDE9FF', headerTint: '#32246C', tabActive: '#6557C8' },
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={({ route }) => {
        const theme = TAB_THEME[route.name] ?? TAB_THEME.index;
        return {
          tabBarActiveTintColor: theme.tabActive,
          tabBarInactiveTintColor: '#B38D71',
          tabBarStyle: {
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            position: 'absolute',
            backgroundColor: 'transparent',
            paddingBottom: insets.bottom,
            height: 90 + insets.bottom,
            paddingHorizontal: 30,
          },
          tabBarShowLabel: false,
          tabBarBackground: () => (
            <LinearGradient
              colors={['rgba(251, 228, 210, 0.93)', 'rgba(251, 200, 188, 0.93)', 'rgba(208, 210, 200, 0.93)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          ),
          tabBarItemStyle: {
            paddingTop: 21,
            paddingBottom: 18,
            alignItems: 'center',
            margin: 0,
          },
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
            tabBarIcon: ({ color, focused }) => (
              <View style={[
                { alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 20 },
                focused && { backgroundColor: '#FEF3ED' },
              ]}>
                <Icon width={24} height={24} color={color} />
              </View>
            ),
            ...(name === 'index' && { header: () => <HomeHeader /> }),
          }}
        />
      ))}
      {HIDDEN.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
