import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

const INITIAL_ITEMS = [
  { id: '1', name: 'Almond Milk', category: 'Dairy & Eggs', quantity: 1, unit: 'carton', addedBy: 'Travis', isChecked: false },
  { id: '2', name: 'Bananas', category: 'Produce', quantity: 1, unit: 'bunch', addedBy: 'Jordan', isChecked: false },
  { id: '3', name: 'Sourdough Bread', category: 'Bakery', quantity: 1, unit: 'loaf', addedBy: 'Casey', isChecked: true },
  { id: '4', name: 'Chicken Thighs', category: 'Meat', quantity: 2, unit: 'lbs', addedBy: 'Travis', isChecked: false },
  { id: '5', name: 'Avocados', category: 'Produce', quantity: 3, unit: 'count', addedBy: 'Jordan', isChecked: false },
  { id: '6', name: 'Pasta Sauce', category: 'Pantry', quantity: 2, unit: 'jars', addedBy: 'Casey', isChecked: true },
  { id: '7', name: 'Dish Soap', category: 'Household', quantity: 1, unit: 'bottle', addedBy: 'Travis', isChecked: false },
  { id: '8', name: 'Paper Towels', category: 'Household', quantity: 2, unit: 'rolls', addedBy: 'Jordan', isChecked: false },
];

const CATEGORY_ORDER = ['Produce', 'Dairy & Eggs', 'Meat', 'Bakery', 'Pantry', 'Household'];

export default function ShoppingScreen() {
  const [items, setItems] = useState(INITIAL_ITEMS);

  const toggle = (id: string) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, isChecked: !i.isChecked } : i));
  };

  const unchecked = items.filter((i) => !i.isChecked);
  const checked = items.filter((i) => i.isChecked);

  const grouped = CATEGORY_ORDER.reduce<Record<string, typeof INITIAL_ITEMS>>((acc, cat) => {
    const catItems = unchecked.filter((i) => i.category === cat);
    if (catItems.length) acc[cat] = catItems;
    return acc;
  }, {});

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Shopping</Text>
        <Text style={styles.subtitle}>{unchecked.length} items left · {checked.length} in cart</Text>

        {Object.entries(grouped).map(([cat, catItems]) => (
          <View key={cat}>
            <Text style={styles.sectionLabel}>{cat.toUpperCase()}</Text>
            {catItems.map((item) => (
              <TouchableOpacity key={item.id} style={styles.card} onPress={() => toggle(item.id)} activeOpacity={0.7}>
                <View style={styles.checkbox}>
                  <Ionicons name="square-outline" size={22} color="#DFE6E9" />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardMeta}>{item.quantity} {item.unit} · added by {item.addedBy}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {checked.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>IN CART ({checked.length})</Text>
            {checked.map((item) => (
              <TouchableOpacity key={item.id} style={[styles.card, styles.cardChecked]} onPress={() => toggle(item.id)} activeOpacity={0.7}>
                <Ionicons name="checkmark-circle" size={22} color="#00B894" />
                <Text style={styles.cardTitleChecked}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFBF5' },
  container: { flex: 1, padding: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#2D3436' },
  subtitle: { color: '#636e72', marginTop: 4, marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#B2BEC3', letterSpacing: 1, marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardChecked: { opacity: 0.6 },
  checkbox: { width: 22, height: 22 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#2D3436' },
  cardTitleChecked: { fontSize: 15, fontWeight: '600', color: '#636e72', textDecorationLine: 'line-through', flex: 1 },
  cardMeta: { fontSize: 12, color: '#636e72', marginTop: 2 },
});
