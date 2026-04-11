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
    backgroundColor: '#FFFBF5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2D3436',
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2D3436',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#DFE6E9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2D3436',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    color: '#636e72',
    marginTop: 4,
  },
  list: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  empty: {
    color: '#636e72',
    textAlign: 'center',
    marginTop: 60,
    fontSize: 15,
  },
  loader: {
    flex: 1,
  },
});
