import { Tabs } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
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
const NAV_ICON_COLOR = '#2E0800';

const ICON_SIZE = 19;
// Increase this number to move every nav icon and the active bubble lower.
const ICON_VERTICAL_OFFSET = 0;
const ACTIVE_PILL = {
  width: 72,
  height: 54,
  borderRadius: 27,
};

const TAB_BAR_HEIGHT = 80;

export default function TabLayout() {
  return (
    <Tabs
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={() => {
        return {
          tabBarActiveTintColor: NAV_ICON_COLOR,
          tabBarInactiveTintColor: NAV_ICON_COLOR,
          tabBarStyle: {
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            position: 'absolute',
            backgroundColor: 'transparent',
            paddingBottom: 0,
            height: TAB_BAR_HEIGHT,
            paddingHorizontal: 34,
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
            height: TAB_BAR_HEIGHT,
            paddingTop: 20,
            paddingBottom: 20,
            alignItems: 'center',
            justifyContent: 'center',
            margin: 0,
          },
          tabBarIconStyle: {
            margin: 0,
            alignItems: 'center',
            justifyContent: 'center',
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
    transform: [{ translateY: ICON_VERTICAL_OFFSET }],
  },
});
