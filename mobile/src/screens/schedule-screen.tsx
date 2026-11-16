import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { createHomework } from "../api/homework";
import { PairCard } from "../components/pair-card";
import { HomeworkFormModal } from "../components/homework-form-modal";
import type { Homework, HomeworkDraft, Role, SchedulePair } from "../types";

type ScheduleScreenProps = {
  role: Role;
  token: string | null;
  initialPairs: SchedulePair[];
  onSubmitHomework?: (draft: HomeworkDraft) => Promise<Homework>;
};

export function ScheduleScreen({
  role,
  token,
  initialPairs,
  onSubmitHomework,
}: ScheduleScreenProps): React.JSX.Element {
  const [pairs, setPairs] = useState(initialPairs);
  const [editingPair, setEditingPair] = useState<SchedulePair | null>(null);

  async function handleSubmitHomework(draft: HomeworkDraft): Promise<void> {
    const save =
      onSubmitHomework ?? ((value: HomeworkDraft) =>
        createHomework(token, value));
    const homework = await save(draft);

    setPairs((current) =>
      current.map((pair) =>
        pair.id === homework.pairId
          ? { ...pair, homeworks: [...pair.homeworks, homework] }
          : pair,
      ),
    );
    setEditingPair(null);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Расписание</Text>
        <Text style={styles.subtitle}>Домашние задания</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {pairs.map((pair) => (
          <PairCard
            key={pair.id}
            pair={pair}
            role={role}
            onAddHomework={setEditingPair}
          />
        ))}
      </ScrollView>

      {editingPair ? (
        <HomeworkFormModal
          pair={editingPair}
          visible
          onClose={() => setEditingPair(null)}
          onSubmit={handleSubmitHomework}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingTop: 56,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 14,
    color: "#64748b",
  },
  list: {
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
});
