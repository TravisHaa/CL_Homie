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
  const end = event.endTime.toDate();
  const timeRange = `${format(start, "h:mm a")} – ${format(end, "h:mm a")}`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { flex: 1 },
        pressed && onPress && { opacity: 0.75 },
      ]}
    >
      <View style={[styles.card, { borderLeftColor: event.color }]}>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.time}>{timeRange}</Text>
        {!!event.description && (
          <Text style={styles.desc}>{event.description}</Text>
        )}
        {event.assignedTo?.length > 0 && (
          <View style={styles.assigneeRow}>
            {event.assignedTo.map((uid) => {
              const member = memberMap[uid];
              if (!member) return null;
              return (
                <View
                  key={uid}
                  style={[styles.dot, { backgroundColor: member.color }]}
                >
                  <Text style={styles.initial}>
                    {member.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  title: { fontSize: 15, fontWeight: "600", color: "#2D3436" },
  time: { fontSize: 12, color: "#636e72", marginTop: 2 },
  desc: { fontSize: 12, color: "#636e72", marginTop: 4, fontStyle: "italic" },
  assigneeRow: { flexDirection: "row", gap: 4, marginTop: 8 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  initial: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
