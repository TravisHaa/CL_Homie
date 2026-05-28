import { Tabs } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PALETTE, RADIUS, SHADOWS } from '@/src/theme/palette';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// V3 nav: Home · Calendar · Chores · Shopping.
// Pantry is reached from Shopping; Settings from the home header — both stay
// routable (href: null keeps the screen but hides the tab).
const TABS: { name: string; title: string; icon: MCIName }[] = [
  { name: 'index', title: 'Home', icon: 'home-variant-outline' },
  { name: 'calendar', title: 'Calendar', icon: 'calendar-blank-outline' },
  { name: 'chores', title: 'Chores', icon: 'broom' },
  { name: 'shopping', title: 'Shopping', icon: 'cart-outline' },
];

const HIDDEN = ['pantry', 'settings', 'two', 'house'];

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: PALETTE.inkHairline,
          backgroundColor: PALETTE.cream,
          height: 64 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      {TABS.map(({ name, title, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ focused }) => (
              <View style={[styles.icon, focused && styles.iconActive]}>
                <MaterialCommunityIcons name={icon} size={24} color={PALETTE.ink} />
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
  icon: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: RADIUS.pill },
  iconActive: { backgroundColor: PALETTE.white, ...SHADOWS.magnet },
});
