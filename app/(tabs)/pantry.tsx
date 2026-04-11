import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const ITEMS = [
  { id: '1', name: 'Eggs', quantity: 6, unit: 'count', category: 'Dairy & Eggs', expiresIn: 5, confidence: 'manual', isShared: true },
  { id: '2', name: 'Whole Milk', quantity: 1, unit: 'gal', category: 'Dairy & Eggs', expiresIn: 3, confidence: 'scanned', isShared: true },
  { id: '3', name: 'Chicken Breast', quantity: 2, unit: 'lbs', category: 'Meat', expiresIn: 1, confidence: 'scanned', isShared: false },
  { id: '4', name: 'Spinach', quantity: 1, unit: 'bag', category: 'Produce', expiresIn: 4, confidence: 'predicted', isShared: true },
  { id: '5', name: 'Cheddar Cheese', quantity: 1, unit: 'block', category: 'Dairy & Eggs', expiresIn: 14, confidence: 'scanned', isShared: true },
  { id: '6', name: 'Greek Yogurt', quantity: 3, unit: 'cups', category: 'Dairy & Eggs', expiresIn: 7, confidence: 'scanned', isShared: false },
  { id: '7', name: 'Pasta', quantity: 2, unit: 'boxes', category: 'Dry Goods', expiresIn: 180, confidence: 'manual', isShared: true },
  { id: '8', name: 'Olive Oil', quantity: 1, unit: 'bottle', category: 'Pantry', expiresIn: 365, confidence: 'manual', isShared: true },
];

function expiryColor(days: number) {
  if (days <= 2) return '#E17055';
  if (days <= 5) return '#FDCB6E';
  return '#00B894';
}

function expiryLabel(days: number) {
  if (days === 1) return 'Expires tomorrow';
  if (days <= 7) return `Expires in ${days}d`;
  return `${days}d left`;
}

export default function PantryScreen() {
  const expiringSoon = ITEMS.filter((i) => i.expiresIn <= 3);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Pantry</Text>
        <Text style={styles.subtitle}>{ITEMS.length} items</Text>

        {expiringSoon.length > 0 && (
          <View style={styles.alertBanner}>
            <Ionicons name="warning-outline" size={16} color="#E17055" />
            <Text style={styles.alertText}>{expiringSoon.length} item{expiringSoon.length > 1 ? 's' : ''} expiring soon</Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>ALL ITEMS</Text>
        {ITEMS.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardLeft}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardMeta}>{item.quantity} {item.unit} · {item.category}</Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={[styles.expiryText, { color: expiryColor(item.expiresIn) }]}>
                {expiryLabel(item.expiresIn)}
              </Text>
              {item.isShared && <Text style={styles.sharedBadge}>Shared</Text>}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFBF5' },
  container: { flex: 1, padding: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#2D3436' },
  subtitle: { color: '#636e72', marginTop: 4, marginBottom: 16 },
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF3F0', borderRadius: 10, padding: 12, marginBottom: 16 },
  alertText: { fontSize: 13, fontWeight: '600', color: '#E17055' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#B2BEC3', letterSpacing: 1, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardLeft: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#2D3436' },
  cardMeta: { fontSize: 12, color: '#636e72', marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  expiryText: { fontSize: 12, fontWeight: '600' },
  sharedBadge: { fontSize: 10, fontWeight: '600', color: '#6C5CE7', backgroundColor: '#6C5CE722', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
});
