import { Pressable, StyleSheet, Text, View } from "react-native";

import { canManageHomework } from "../auth/roles";
import type { Role, SchedulePair } from "../types";

type PairCardProps = {
  pair: SchedulePair;
  role: Role;
  onAddHomework: (pair: SchedulePair) => void;
};

export function PairCard({
  pair,
  role,
  onAddHomework,
}: PairCardProps): React.JSX.Element {
  return (
    <View style={styles.card}>
      <View style={styles.timeColumn}>
        <Text style={styles.startTime}>{pair.startTime}</Text>
        <Text style={styles.endTime}>{pair.endTime}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.heading}>
          <Text style={styles.subject}>{pair.subject}</Text>
          <Text style={styles.subgroup}>
            {pair.subgroup === null
              ? "Вся группа"
              : `Подгруппа ${pair.subgroup}`}
          </Text>
        </View>

        {pair.homeworks.length === 0 ? (
          <Text style={styles.emptyHomework}>
            Домашнего задания пока нет
          </Text>
        ) : (
          <View style={styles.homeworkBlock}>
            <Text style={styles.homeworkTitle}>Домашнее задание</Text>
            {pair.homeworks.map((homework) => (
              <Text key={homework.id} style={styles.homeworkText}>
                {homework.description}
              </Text>
            ))}
          </View>
        )}

        {canManageHomework(role) ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Добавить ДЗ"
            onPress={() => onAddHomework(pair)}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>+ Добавить ДЗ</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    backgroundColor: "#ffffff",
    padding: 16,
  },
  timeColumn: {
    width: 52,
  },
  startTime: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  endTime: {
    marginTop: 2,
    fontSize: 12,
    color: "#64748b",
  },
  content: {
    flex: 1,
    gap: 10,
  },
  heading: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  subject: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  subgroup: {
    fontSize: 11,
    color: "#475569",
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  emptyHomework: {
    fontSize: 13,
    color: "#94a3b8",
  },
  homeworkBlock: {
    gap: 3,
  },
  homeworkTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: "#2563eb",
  },
  homeworkText: {
    fontSize: 14,
    color: "#0f172a",
  },
  addButton: {
    alignSelf: "flex-start",
    borderRadius: 10,
    backgroundColor: "#2563eb",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ffffff",
  },
});
