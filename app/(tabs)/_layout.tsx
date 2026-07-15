import { Tabs } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CalendarIcon from '@/assets/images/CalendarIcon.svg';
import HomeIcon from '@/assets/images/HomeIcon.svg';
import PantryIcon from '@/assets/images/PantryIcon.svg';
import ShoppingIcon from '@/assets/images/ShoppingIcon.svg';

const TABS: { name: string; title: string; Icon: React.FC<{ width: number; height: number; color?: string }> }[] = [
  { name: 'index', title: 'Home', Icon: HomeIcon },
  { name: 'calendar', title: 'Calendar', Icon: CalendarIcon },
  { name: 'chores', title: 'Chores', Icon: PantryIcon },
  { name: 'shopping', title: 'Shopping', Icon: ShoppingIcon },
];

const HIDDEN = ['pantry', 'two', 'house', 'settings', 'noticeboard', 'myaccount'];
const TAB_ACTIVE: Record<string, string> = {
  index: '#A7572D',
  chores: '#1B8F63',
  pantry: '#1B8F63',
  shopping: '#C15B2A',
  settings: '#6557C8',
};

const ICON_SIZE = 21;
const ACTIVE_PILL = {
  width: 76,
  height: 52,
  borderRadius: 26,
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={({ route }) => {
        const tabActive = TAB_ACTIVE[route.name] ?? TAB_ACTIVE.index;
        return {
          tabBarActiveTintColor: tabActive,
          tabBarInactiveTintColor: '#B38D71',
          tabBarStyle: {
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            position: 'absolute',
            backgroundColor: 'transparent',
            paddingBottom: insets.bottom,
            height: 84 + insets.bottom,
            paddingHorizontal: 26,
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
            paddingTop: 12,
            paddingBottom: 12,
            alignItems: 'center',
            justifyContent: 'center',
            margin: 0,
          },
          headerShown: false,
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
                styles.iconWrap,
                focused && { backgroundColor: '#FEF3ED' },
              ]}>
                <Icon width={ICON_SIZE} height={ICON_SIZE} color={color} />
              </View>
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

const styles = StyleSheet.create({
  iconWrap: {
    ...ACTIVE_PILL,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
