import { View, Text, StyleSheet } from 'react-native';

interface Props {
  title: string;
  notes?: string;
  tag?: string | null;
  createdAt: Date;
}

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

export function NoticeCard({ title, notes, tag, createdAt }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {notes ? <Text style={styles.notes}>{notes}</Text> : null}
      </View>
      <View style={styles.right}>
        {tag ? (
          <View style={styles.tagBadge}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ) : null}
        <Text style={styles.time}>{timeAgo(createdAt)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  body: { flex: 1, paddingRight: 12 },
  title: {
    fontFamily: 'AlbertSans_700Bold',
    fontSize: 15,
    color: '#2E0800',
    marginBottom: 4,
  },
  notes: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 13,
    color: '#7A6652',
  },
  right: { alignItems: 'flex-end', justifyContent: 'center', gap: 6, alignSelf: 'stretch' },
  tagBadge: {
    backgroundColor: '#2D1A0E',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  tagText: {
    fontFamily: 'AlbertSans_600SemiBold',
    fontSize: 13,
    color: '#fff',
  },
  time: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 12,
    color: '#7A6652',
  },
});
