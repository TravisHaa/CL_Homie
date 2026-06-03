import { useHouseStore } from "@/src/store/houseStore";
import type { CalendarEvent } from "@/src/types";
import { format } from "date-fns";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
        {/* Title row */}
        <View style={styles.topRow}>
          <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
          <View style={styles.duePill}>
            <Text style={styles.dueText}>Due {format(start, "M/d")}</Text>
          </View>
        </View>

        {/* Assignee row */}
        {firstAssignee && (
          <View style={styles.assigneeRow}>
            <View style={[styles.avatar, { backgroundColor: firstAssignee.color ?? '#6B5E52' }]}>
              <Text style={styles.avatarInitial}>
                {firstAssignee.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.assigneeText}>
              Assigned to{" "}
              {assignees.map((m) => m!.displayName).join(", ")}
            </Text>
          </View>
        )}

        {!!event.description && (
          <Text style={styles.desc}>{event.description}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },
  title: { flex: 1, fontSize: 15, fontWeight: "700", color: "#2D1A0E" },
  duePill: {
    backgroundColor: "#C8D8E8",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dueText: { fontSize: 12, fontWeight: "600", color: "#4A6A84" },
  assigneeRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { color: "#fff", fontSize: 11, fontWeight: "700" },
  assigneeText: { fontSize: 12, color: "#9E9380" },
  desc: { fontSize: 12, color: "#9E9380", marginTop: 6, fontStyle: "italic" },
});
