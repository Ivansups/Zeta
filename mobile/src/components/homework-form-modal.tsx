import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { buildDateOptions, formatDate } from "../lib/date";
import type { HomeworkDraft, SchedulePair, Subgroup } from "../types";

type HomeworkFormModalProps = {
  pair: SchedulePair;
  visible: boolean;
  onClose: () => void;
  onSubmit: (draft: HomeworkDraft) => Promise<void>;
};

const SUBGROUPS: { value: Subgroup | null; label: string }[] = [
  { value: null, label: "Вся группа" },
  { value: 1, label: "Подгруппа 1" },
  { value: 2, label: "Подгруппа 2" },
];

export function HomeworkFormModal({
  pair,
  visible,
  onClose,
  onSubmit,
}: HomeworkFormModalProps): React.JSX.Element | null {
  const [subgroup, setSubgroup] = useState<Subgroup | null>(pair.subgroup);
  const [date, setDate] = useState(pair.date);
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!visible) {
    return null;
  }

  async function handleSubmit(): Promise<void> {
    const trimmed = description.trim();
    if (!trimmed) {
      setError("Добавьте описание задания");
      return;
    }

    setError("");
    setSaving(true);
    try {
      await onSubmit({
        pairId: pair.id,
        subgroup,
        description: trimmed,
        date,
      });
    } catch {
      setError("Не удалось сохранить задание. Попробуйте ещё раз.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Новое домашнее задание</Text>
          <Text style={styles.pairName}>{pair.subject}</Text>

          <ScrollView contentContainerStyle={styles.form}>
            <Text style={styles.label}>Подгруппа</Text>
            <View style={styles.chipRow}>
              {SUBGROUPS.map((option) => {
                const selected = option.value === subgroup;
                return (
                  <Pressable
                    key={option.label}
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                    accessibilityState={{ selected }}
                    onPress={() => setSubgroup(option.value)}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Дата</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {buildDateOptions(pair.date, 7).map((option) => {
                const selected = option === date;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityLabel={formatDate(option)}
                    accessibilityState={{ selected }}
                    onPress={() => setDate(option)}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                      ]}
                    >
                      {formatDate(option)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.label}>Описание задания</Text>
            <TextInput
              accessibilityLabel="Описание задания"
              multiline
              value={description}
              onChangeText={(value) => {
                setDescription(value);
                setError("");
              }}
              placeholder="Например: решить задачи 12–18 из практикума"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              textAlignVertical="top"
            />

            {error ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Отмена"
              disabled={saving}
              onPress={onClose}
              style={[styles.button, styles.secondaryButton]}
            >
              <Text style={styles.secondaryButtonText}>Отмена</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Сохранить ДЗ"
              accessibilityState={{ disabled: saving }}
              disabled={saving}
              onPress={handleSubmit}
              style={[styles.button, styles.primaryButton]}
            >
              <Text style={styles.primaryButtonText}>Сохранить ДЗ</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  sheet: {
    maxHeight: "90%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  pairName: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748b",
  },
  form: {
    gap: 10,
    paddingVertical: 16,
  },
  label: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: "#475569",
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: {
    borderColor: "#2563eb",
    backgroundColor: "#2563eb",
  },
  chipText: {
    fontSize: 13,
    color: "#334155",
  },
  chipTextSelected: {
    fontWeight: "600",
    color: "#ffffff",
  },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#0f172a",
  },
  error: {
    fontSize: 13,
    color: "#dc2626",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  button: {
    flex: 1,
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 13,
  },
  secondaryButton: {
    backgroundColor: "#f1f5f9",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
  },
  primaryButton: {
    backgroundColor: "#2563eb",
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },
});
