import { Image, StyleSheet, Text, View } from 'react-native';

export interface NotificationItem {
  boldText: string;
  message: string;
  avatarColor: string;
  avatarUrl?: string | null;
  avatarInitial: string;
  timeAgo: string;
}

interface Props {
  notifications: NotificationItem[];
}

export function NotificationCard({ notifications }: Props) {
  return (
    <View style={styles.card}>
      {notifications.slice(0, 3).map((n, i) => (
        <View key={i} style={styles.box}>
          <Text style={styles.messageText} numberOfLines={2}>
            <Text style={styles.bold}>{n.boldText}</Text>
            {n.message}
          </Text>
          <View style={styles.footer}>
            <View style={[styles.avatar, { backgroundColor: n.avatarColor }]}>
              {n.avatarUrl ? (
                <Image source={{ uri: n.avatarUrl }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarInitial}>{n.avatarInitial}</Text>
              )}
            </View>
            <Text style={styles.timeText}>{n.timeAgo}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2E0800',
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 28,
    gap: 16,
    width: '90%',
    marginTop: 100,
    transform: [{ rotate: '-1.6deg' }],
    alignSelf: 'center',
    height: 380,
  },
  box: {
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    width: '100%',
    aspectRatio: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  messageText: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 13,
    color: '#2E0800',
    lineHeight: 18,
  },
  bold: {
    fontFamily: 'AlbertSans_700Bold',
    color: '#2E0800',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 26, height: 26, borderRadius: 13 },
  avatarInitial: {
    fontFamily: 'AlbertSans_700Bold',
    fontSize: 11,
    color: '#fff',
  },
  timeText: {
    fontFamily: 'AlbertSans_400Regular',
    fontSize: 12,
    color: '#7A6652',
  },
});
