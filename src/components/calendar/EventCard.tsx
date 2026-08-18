import { useHouseStore } from "@/src/store/houseStore";
import type { CalendarEvent } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

interface Props {
  event: CalendarEvent;
  onPress?: () => void;
}

export function EventCard({ event, onPress }: Props) {
  const memberMap = useHouseStore((s) => s.memberMap);
  const start = event.startTime.toDate();

  const assignees = (event.assignedTo ?? [])
    .map((uid) => memberMap[uid])
    .filter(Boolean);

  const firstAssignee = assignees[0];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ flex: 1 }, pressed && onPress && { opacity: 0.75 }]}
    >
      <View style={styles.card}>
        <View style={styles.iconBubble}>
          <Ionicons name="calendar-outline" size={22} color="#3B1F0E" />
        </View>

        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>{event.title}</Text>

          {firstAssignee && (
            <View style={styles.assigneeRow}>
              {firstAssignee.avatarUrl ? (
                <Image source={{ uri: firstAssignee.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: firstAssignee.color ?? '#7B6258' }]}>
                  <Text style={styles.avatarInitial}>
                    {firstAssignee.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.assigneeText} numberOfLines={1}>
                Assigned to {assignees.map((m) => m!.displayName).join(", ")}
              </Text>
            </View>
          )}

          {!!event.description && (
            <Text style={styles.desc} numberOfLines={1}>{event.description}</Text>
          )}
        </View>

        <View style={styles.duePill}>
          <Text style={styles.dueText}>Due {format(start, "M/d")}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 32,
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 14,
  },
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF0E8",
  },
  body: { flex: 1, minWidth: 0, gap: 8 },
  title: { fontSize: 16, fontFamily: 'AlbertSans_600SemiBold', color: '#2E0800' },
  duePill: {
    backgroundColor: "#AFCCD8",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  dueText: { fontSize: 14, fontFamily: 'AlbertSans_600SemiBold', color: "#FFFFFF" },
  assigneeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { color: "#fff", fontSize: 11, fontFamily: 'AlbertSans_700Bold' },
  assigneeText: { flex: 1, fontSize: 14, fontFamily: 'AlbertSans_400Regular', color: "#8A7068" },
  desc: { fontSize: 12, fontFamily: 'AlbertSans_400Regular', color: "#9E9380" },
});
