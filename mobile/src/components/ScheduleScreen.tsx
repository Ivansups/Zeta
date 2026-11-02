import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from "react-native";
import { DayOfWeek, SchedulePair, Subgroup, User } from "../types";
import { api } from "../services/api";

interface ScheduleScreenProps {
  user: User;
  subgroup: Subgroup;
  onSubgroupChange: (subgroup: Subgroup) => void;
}

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: "monday", label: "Пн" },
  { key: "tuesday", label: "Вт" },
  { key: "wednesday", label: "Ср" },
  { key: "thursday", label: "Чт" },
  { key: "friday", label: "Пт" },
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
    void api.getSchedule(selectedDay, subgroup).then((data) => {
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
      {/* Шапка расписания */}
      <View style={styles.header}>
        <View>
          <Text style={styles.groupTitle}>Группа {user.groupName}</Text>
          <Text style={styles.subgroupSubtitle}>
            {user.role === "elder" ? "Староста" : "Студент"}: {user.firstName} {user.lastName ?? ""}
          </Text>
        </View>

        {/* Переключатель подгруппы */}
        <View style={styles.subgroupSwitch}>
          <TouchableOpacity
            style={[styles.subgroupBtn, subgroup === 1 && styles.subgroupBtnActive]}
            onPress={() => onSubgroupChange(1)}
            testID="subgroup-btn-1"
          >
            <Text style={[styles.subgroupBtnText, subgroup === 1 && styles.subgroupBtnTextActive]}>
              Подгр. 1
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.subgroupBtn, subgroup === 2 && styles.subgroupBtnActive]}
            onPress={() => onSubgroupChange(2)}
            testID="subgroup-btn-2"
          >
            <Text style={[styles.subgroupBtnText, subgroup === 2 && styles.subgroupBtnTextActive]}>
              Подгр. 2
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Дни недели */}
      <View style={styles.daysRow}>
        {DAYS.map((day) => {
          const isActive = selectedDay === day.key;
          return (
            <TouchableOpacity
              key={day.key}
              style={[styles.dayButton, isActive && styles.dayButtonActive]}
              onPress={() => setSelectedDay(day.key)}
              testID={`day-btn-${day.key}`}
            >
              <Text style={[styles.dayButtonText, isActive && styles.dayButtonTextActive]}>
                {day.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Список пар */}
      <View style={styles.pairsContainer}>
        <Text style={styles.sectionTitle}>
          Расписание на {DAYS.find((d) => d.key === selectedDay)?.label} (Подгруппа {subgroup})
        </Text>

        {pairs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>В этот день занятий нет</Text>
          </View>
        ) : (
          pairs.map((pair) => (
            <View key={pair.id} style={styles.pairCard} testID="pair-card">
              <View style={styles.pairHeader}>
                <View style={styles.timeBadge}>
                  <Text style={styles.timeText}>
                    {pair.timeStart} – {pair.timeEnd}
                  </Text>
                </View>
                <Text style={styles.pairNumber}>{pair.pairNumber} пара</Text>
              </View>

              <Text style={styles.subjectText}>{pair.subject}</Text>

              <View style={styles.pairFooter}>
                <Text style={styles.teacherText}>{pair.teacher}</Text>
                <Text style={styles.classroomText}>{pair.classroom}</Text>
              </View>

              {pair.subgroup ? (
                <View style={styles.subgroupBadge}>
                  <Text style={styles.subgroupBadgeText}>Подгруппа {pair.subgroup}</Text>
                </View>
              ) : null}
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
    backgroundColor: "#f8fafc",
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
  },
  subgroupSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  subgroupSwitch: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderRadius: 8,
    padding: 2,
  },
  subgroupBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  subgroupBtnActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  subgroupBtnText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  subgroupBtnTextActive: {
    color: "#0f172a",
    fontWeight: "600",
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  dayButton: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  dayButtonActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  dayButtonTextActive: {
    color: "#ffffff",
  },
  pairsContainer: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 12,
  },
  pairCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  pairHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  timeBadge: {
    backgroundColor: "#eff6ff",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563eb",
  },
  pairNumber: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  subjectText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
  },
  pairFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  teacherText: {
    fontSize: 13,
    color: "#64748b",
  },
  classroomText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#0f172a",
  },
  subgroupBadge: {
    alignSelf: "flex-start",
    marginTop: 10,
    backgroundColor: "#fef3c7",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  subgroupBadgeText: {
    fontSize: 11,
    color: "#92400e",
    fontWeight: "500",
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyText: {
    fontSize: 14,
    color: "#94a3b8",
  },
});
