import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- Filler data ---
const CHORES = [
  { id: '1', title: 'Take out trash', assignee: 'Travis', color: '#6C5CE7', done: true },
  { id: '2', title: 'Vacuum living room', assignee: 'Jordan', color: '#00B894', done: false },
  { id: '3', title: 'Clean bathroom', assignee: 'Casey', color: '#E17055', done: false },
  { id: '4', title: 'Wipe down kitchen', assignee: 'Travis', color: '#6C5CE7', done: false },
];

const EVENTS = [
  { id: '1', title: 'House meeting', time: 'Today 7 PM', color: '#6C5CE7' },
  { id: '2', title: 'Grocery run', time: 'Tomorrow 11 AM', color: '#00B894' },
  { id: '3', title: 'Rent due', time: 'Apr 15', color: '#E17055' },
];

const EXPIRING = [
  { id: '1', name: 'Chicken Breast', days: 1 },
  { id: '2', name: 'Whole Milk', days: 3 },
  { id: '3', name: 'Spinach', days: 4 },
];

const MEMBERS = [
  { id: '1', name: 'Travis', color: '#6C5CE7' },
  { id: '2', name: 'Jordan', color: '#00B894' },
  { id: '3', name: 'Casey', color: '#E17055' },
];

// Magnet dot decoration
function Magnet({ color }: { color: string }) {
  return <View style={[styles.magnetDot, { backgroundColor: color }]} />;
}

export default function HomeScreen() {
  const doneCount = CHORES.filter((c) => c.done).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.fridge}
        contentContainerStyle={styles.fridgeContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.houseName}>The Homies</Text>
          <View style={styles.membersRow}>
            {MEMBERS.map((m) => (
              <View key={m.id} style={[styles.avatar, { backgroundColor: m.color }]}>
                <Text style={styles.avatarText}>{m.name[0]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Row 1: Chores note (tilted left) + Events note (tilted right) */}
        <View style={styles.magnetRow}>
          {/* Chores magnet */}
          <View style={[styles.note, styles.noteTiltLeft, { flex: 1.1 }]}>
            <Magnet color="#6C5CE7" />
            <Text style={styles.noteTitle}>This week's chores</Text>
            <Text style={styles.noteMeta}>{doneCount}/{CHORES.length} done</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(doneCount / CHORES.length) * 100}%` }]} />
            </View>
            {CHORES.map((c) => (
              <View key={c.id} style={styles.choreRow}>
                <View style={[styles.choreDot, { backgroundColor: c.done ? '#DFE6E9' : c.color }]} />
                <Text style={[styles.choreText, c.done && styles.choreTextDone]} numberOfLines={1}>
                  {c.title}
                </Text>
              </View>
            ))}
          </View>

          {/* Events magnet */}
          <View style={[styles.note, styles.noteTiltRight, { flex: 0.9 }]}>
            <Magnet color="#FDCB6E" />
            <Text style={styles.noteTitle}>Coming up</Text>
            {EVENTS.map((e) => (
              <View key={e.id} style={styles.eventRow}>
                <View style={[styles.eventDot, { backgroundColor: e.color }]} />
                <View>
                  <Text style={styles.eventTitle} numberOfLines={1}>{e.title}</Text>
                  <Text style={styles.eventTime}>{e.time}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Row 2: Expiring soon note (full width, slight tilt) */}
        <View style={[styles.note, styles.noteTiltMild, styles.noteWide]}>
          <Magnet color="#E17055" />
          <Text style={styles.noteTitle}>Expiring soon</Text>
          <View style={styles.expiringList}>
            {EXPIRING.map((item) => (
              <View key={item.id} style={styles.expiringChip}>
                <Text style={styles.expiringName}>{item.name}</Text>
                <Text style={[styles.expiringDays, { color: item.days <= 2 ? '#E17055' : '#FDCB6E' }]}>
                  {item.days === 1 ? 'tmrw' : `${item.days}d`}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Row 3: Quick reminder note */}
        <View style={[styles.note, styles.noteTiltLeft, styles.noteCompact]}>
          <Magnet color="#00B894" />
          <Text style={styles.noteTitle}>Don't forget</Text>
          <Text style={styles.reminderText}>{'📦 Costco run this weekend\n🧴 Almost out of dish soap\n💸 Venmo Casey for groceries'}</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#D6D3CC' },
  fridge: { flex: 1 },
  fridgeContent: { padding: 16, paddingBottom: 32 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  houseName: { fontSize: 22, fontWeight: '800', color: '#2D3436' },
  membersRow: { flexDirection: 'row', gap: 6 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  magnetRow: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },

  // Base note card
  note: {
    backgroundColor: '#FFFEF0',
    borderRadius: 4,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 2, height: 4 },
    elevation: 4,
  },
  noteWide: { marginBottom: 14 },
  noteCompact: { alignSelf: 'flex-start', maxWidth: '70%' },

  noteTiltLeft: { transform: [{ rotate: '-1.5deg' }] },
  noteTiltRight: { transform: [{ rotate: '2deg' }] },
  noteTiltMild: { transform: [{ rotate: '0.8deg' }] },

  magnetDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignSelf: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },

  noteTitle: { fontSize: 13, fontWeight: '800', color: '#2D3436', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  noteMeta: { fontSize: 11, color: '#636e72', marginBottom: 6 },

  progressBar: { height: 4, backgroundColor: '#DFE6E9', borderRadius: 2, marginBottom: 10 },
  progressFill: { height: 4, backgroundColor: '#6C5CE7', borderRadius: 2 },

  choreRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 5 },
  choreDot: { width: 8, height: 8, borderRadius: 4 },
  choreText: { fontSize: 13, color: '#2D3436', flex: 1 },
  choreTextDone: { color: '#B2BEC3', textDecorationLine: 'line-through' },

  eventRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  eventDot: { width: 8, height: 8, borderRadius: 4, marginTop: 3 },
  eventTitle: { fontSize: 13, fontWeight: '600', color: '#2D3436' },
  eventTime: { fontSize: 11, color: '#636e72' },

  expiringList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  expiringChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  expiringName: { fontSize: 12, fontWeight: '600', color: '#2D3436' },
  expiringDays: { fontSize: 11, fontWeight: '700' },

  reminderText: { fontSize: 13, color: '#2D3436', lineHeight: 22 },
});
