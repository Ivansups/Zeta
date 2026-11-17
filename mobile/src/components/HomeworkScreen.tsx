import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { DayOfWeek, HomeworkItem, Subgroup, User } from "../types";
import { theme } from "../theme/colors";
import { api } from "../services/api";

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Пн",
  tuesday: "Вт",
  wednesday: "Ср",
  thursday: "Чт",
  friday: "Пт",
  saturday: "Сб",
};

interface HomeworkScreenProps {
  user: User;
  subgroup?: Subgroup;
  onSubgroupChange?: (subgroup: Subgroup) => void;
}

export function HomeworkScreen({
  user,
  subgroup = 1,
  onSubgroupChange,
}: HomeworkScreenProps): React.JSX.Element {
  const [homeworks, setHomeworks] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    void api.getHomeworks(subgroup).then((data: HomeworkItem[]) => {
      if (isMounted) {
        setHomeworks(data);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [subgroup]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Шапка */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Группа {user.groupName}</Text>
        <Text style={styles.title}>Домашние задания</Text>
        <Text style={styles.subtitle}>
          {homeworks.length} {homeworks.length === 1 ? "задание" : "заданий"} к сдаче
        </Text>
      </View>

      {/* Переключатель подгруппы */}
      {onSubgroupChange && (
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              subgroup === 1 && styles.segmentBtnActive,
            ]}
            onPress={() => onSubgroupChange(1)}
            testID="hw-subgroup-btn-1"
          >
            <Text
              style={[
                styles.segmentText,
                subgroup === 1 && styles.segmentTextActive,
              ]}
            >
              Подгруппа 1
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              subgroup === 2 && styles.segmentBtnActive,
            ]}
            onPress={() => onSubgroupChange(2)}
            testID="hw-subgroup-btn-2"
          >
            <Text
              style={[
                styles.segmentText,
                subgroup === 2 && styles.segmentTextActive,
              ]}
            >
              Подгруппа 2
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Список заданий */}
      {loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptySubtitle}>Загрузка заданий...</Text>
        </View>
      ) : homeworks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>Заданий нет</Text>
          <Text style={styles.emptySubtitle}>
            Для выбранной подгруппы все домашние задания выполнены или ещё не добавлены.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {homeworks.map((hw: HomeworkItem) => (
            <View
              key={hw.id}
              style={styles.card}
              testID={`hw-card-${hw.id}`}
            >
              <View style={styles.cardTopRow}>
                <Text style={styles.subjectText}>{hw.subject}</Text>
                {hw.subgroup ? (
                  <View style={styles.subgroupPill}>
                    <Text style={styles.subgroupPillText}>
                      {hw.subgroup} п/гр
                    </Text>
                  </View>
                ) : (
                  <View style={styles.commonPill}>
                    <Text style={styles.commonPillText}>Общая</Text>
                  </View>
                )}
              </View>

              <Text style={styles.taskTitle}>{hw.title}</Text>
              <Text style={styles.taskDescription}>{hw.description}</Text>

              <View style={styles.cardFooter}>
                <View style={styles.deadlineContainer}>
                  <Text style={styles.deadlineIcon}>⏰</Text>
                  <Text style={styles.deadlineText}>Дедлайн: {hw.deadline}</Text>
                </View>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>
                    {DAY_LABELS[hw.day] || hw.day}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Действия старосты / хелпера */}
      {(user.role === "elder" || user.role === "helper") && (
        <TouchableOpacity
          style={styles.addButton}
          testID="add-homework-button"
        >
          <Text style={styles.addButtonText}>+ Добавить задание</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 54,
    backgroundColor: theme.colors.background,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: theme.colors.foreground,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 2,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radii.md,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: theme.radii.sm,
  },
  segmentBtnActive: {
    backgroundColor: theme.colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.muted,
  },
  segmentTextActive: {
    color: theme.colors.primary,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  subjectText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flex: 1,
  },
  subgroupPill: {
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radii.sm,
  },
  subgroupPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  commonPill: {
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radii.sm,
  },
  commonPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.mutedStrong,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.foreground,
    marginBottom: 6,
  },
  taskDescription: {
    fontSize: 13,
    color: theme.colors.mutedStrong,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSoft,
    paddingTop: 10,
  },
  deadlineContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  deadlineIcon: {
    fontSize: 12,
  },
  deadlineText: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.foreground,
  },
  dayBadge: {
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.xs,
  },
  dayBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.mutedStrong,
  },
  emptyContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 12,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.foreground,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.muted,
    textAlign: "center",
    lineHeight: 18,
  },
  addButton: {
    marginTop: 16,
    backgroundColor: theme.colors.primarySoft,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.radii.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.primary,
  },
});
