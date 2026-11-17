import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from "react-native";
import { DayOfWeek, SchedulePair, Subgroup, User } from "../types";
import { api } from "../services/api";
import { theme } from "../theme/colors";

interface ScheduleScreenProps {
  user: User;
  subgroup: Subgroup;
  onSubgroupChange: (subgroup: Subgroup) => void;
}

const DAYS: { key: DayOfWeek; label: string; date: string }[] = [
  { key: "monday", label: "Пн", date: "12" },
  { key: "tuesday", label: "Вт", date: "13" },
  { key: "wednesday", label: "Ср", date: "14" },
  { key: "thursday", label: "Чт", date: "15" },
  { key: "friday", label: "Пт", date: "16" },
];

export function ScheduleScreen({
  user,
  subgroup,
  onSubgroupChange,
}: ScheduleScreenProps): React.JSX.Element {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>("monday");
  const [pairs, setPairs] = useState<SchedulePair[]>([]);

  useEffect(() => {
    let isMounted = true;
    void api.getSchedule(selectedDay, subgroup).then((data: SchedulePair[]) => {
      if (isMounted) {
        setPairs(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [selectedDay, subgroup]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Шапка страницы */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>
          {user.role === "elder" ? "Староста" : "Студент"} · Числитель
        </Text>
        <Text style={styles.title}>Расписание</Text>
        <Text style={styles.subtitle}>
          Группа {user.groupName} · {user.firstName} {user.lastName ?? ""}
        </Text>
      </View>

      {/* Переключатель подгруппы (Segmented Control) */}
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segmentBtn, subgroup === 1 && styles.segmentBtnActive]}
          onPress={() => onSubgroupChange(1)}
          testID="subgroup-btn-1"
        >
          <Text style={[styles.segmentText, subgroup === 1 && styles.segmentTextActive]}>
            Подгруппа 1
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, subgroup === 2 && styles.segmentBtnActive]}
          onPress={() => onSubgroupChange(2)}
          testID="subgroup-btn-2"
        >
          <Text style={[styles.segmentText, subgroup === 2 && styles.segmentTextActive]}>
            Подгруппа 2
          </Text>
        </TouchableOpacity>
      </View>

      {/* Полоса дней недели (Week Strip) */}
      <View style={styles.weekStrip}>
        {DAYS.map((day) => {
          const isActive = selectedDay === day.key;
          return (
            <TouchableOpacity
              key={day.key}
              style={[styles.weekDayBtn, isActive && styles.weekDayBtnActive]}
              onPress={() => setSelectedDay(day.key)}
              testID={`day-btn-${day.key}`}
            >
              <Text style={[styles.weekDayLabel, isActive && styles.weekDayLabelActive]}>
                {day.label}
              </Text>
              <Text style={[styles.weekDayDate, isActive && styles.weekDayDateActive]}>
                {day.date}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Список занятий */}
      <View style={styles.pairsSection}>
        <Text style={styles.sectionHeading}>
          {DAYS.find((d) => d.key === selectedDay)?.label}, {DAYS.find((d) => d.key === selectedDay)?.date} октября · {pairs.length} пары
        </Text>

        {pairs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>В этот день занятий нет</Text>
          </View>
        ) : (
          pairs.map((pair) => (
            <View key={pair.id} style={styles.lessonCard} testID="pair-card">
              {/* Колонка времени */}
              <View style={styles.timeColumn}>
                <Text style={styles.timeStart}>{pair.timeStart}</Text>
                <Text style={styles.timeEnd}>{pair.timeEnd}</Text>
              </View>

              {/* Основная часть карточки */}
              <View style={styles.lessonMain}>
                <View style={styles.lessonHeader}>
                  <Text style={styles.subjectText}>{pair.subject}</Text>
                  {pair.subgroup ? (
                    <View style={styles.subgroupPill}>
                      <Text style={styles.subgroupPillText}>Подгр. {pair.subgroup}</Text>
                    </View>
                  ) : (
                    <View style={styles.allGroupPill}>
                      <Text style={styles.allGroupPillText}>Вся группа</Text>
                    </View>
                  )}
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>📍 {pair.classroom}</Text>
                  <Text style={styles.metaText}>👤 {pair.teacher}</Text>
                </View>

                <View style={styles.homeworkInline}>
                  <Text style={styles.homeworkInlineText}>
                    📝 Домашнее задание пока не добавлено
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 54,
    backgroundColor: theme.colors.background,
    flexGrow: 1,
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
    fontSize: 28,
    fontWeight: "800",
    color: theme.colors.foreground,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.muted,
    marginTop: 2,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radii.md,
    padding: 3,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    marginBottom: 14,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: theme.radii.sm,
    alignItems: "center",
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
    fontWeight: "500",
    color: theme.colors.muted,
  },
  segmentTextActive: {
    color: theme.colors.foreground,
    fontWeight: "600",
  },
  weekStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  weekDayBtn: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 8,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  weekDayBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  weekDayLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: theme.colors.muted,
  },
  weekDayLabelActive: {
    color: "#ffffff",
  },
  weekDayDate: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.foreground,
    marginTop: 2,
  },
  weekDayDateActive: {
    color: "#ffffff",
  },
  pairsSection: {
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.mutedStrong,
    marginBottom: 12,
  },
  lessonCard: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  timeColumn: {
    width: 70,
    backgroundColor: theme.colors.surfaceMuted,
    borderRightWidth: 1,
    borderRightColor: theme.colors.borderSoft,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  timeStart: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.foreground,
  },
  timeEnd: {
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 2,
  },
  lessonMain: {
    flex: 1,
    padding: 12,
  },
  lessonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  subjectText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.foreground,
    marginRight: 6,
  },
  subgroupPill: {
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
  },
  subgroupPillText: {
    fontSize: 10,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  allGroupPill: {
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.radii.full,
  },
  allGroupPillText: {
    fontSize: 10,
    fontWeight: "500",
    color: theme.colors.muted,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 12,
    color: theme.colors.muted,
  },
  homeworkInline: {
    backgroundColor: theme.colors.surfaceMuted,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  homeworkInlineText: {
    fontSize: 11,
    color: theme.colors.mutedStrong,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.muted,
  },
});
