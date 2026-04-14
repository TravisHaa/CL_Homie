import { useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useChores } from '@/src/hooks/useChores';
import { ChoreCard } from '@/src/components/chores/ChoreCard';
import { ChoreForm } from '@/src/components/chores/ChoreForm';

const CH = {
  peachBg: '#FFF0E2',
  plateBg: '#FFE2CB',
  plateBorder: '#F4BA93',
  textStrong: '#5A2F1A',
  textSoft: '#946345',
  track: '#F2CFB5',
  fill: '#D97745',
  fab: '#D97745',
};

export default function ChoresScreen() {
  const { chores, isLoading, addChore, toggleChore } = useChores();
  const sheetRef = useRef<BottomSheetModal>(null);

  const done = chores.filter((c) => c.isCompleted).length;
  const total = chores.length;
  const progress = total > 0 ? done / total : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Chores</Text>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => sheetRef.current?.present()}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {total > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
          </View>
          <Text style={styles.progressLabel}>
            {done}/{total} done
          </Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color="#2D3436" />
      ) : (
        <FlatList
          data={chores}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChoreCard chore={item} onToggle={toggleChore} />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No chores this week. Tap + to add one!</Text>
          }
        />
      )}

      <ChoreForm ref={sheetRef} onSubmit={addChore} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CH.peachBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CH.plateBorder,
    backgroundColor: CH.plateBg,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: CH.textStrong,
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: CH.fab,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  progressTrack: {
    height: 6,
    backgroundColor: CH.track,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: CH.fill,
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    color: CH.textSoft,
    marginTop: 4,
  },
  list: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  empty: {
    color: CH.textSoft,
    textAlign: 'center',
    marginTop: 60,
    fontSize: 15,
  },
  loader: {
    flex: 1,
  },
});
