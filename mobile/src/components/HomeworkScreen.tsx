import React from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { User } from "../types";

interface HomeworkScreenProps {
  user: User;
}

export function HomeworkScreen({ user }: HomeworkScreenProps): React.JSX.Element {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Домашние задания</Text>
      <Text style={styles.subtitle}>Группа: {user.groupName}</Text>

      <View style={styles.card}>
        <Text style={styles.cardHeader}>📌 Статус модуля ДЗ</Text>
        <Text style={styles.cardText}>
          В Итерации 1 реализован каркас и просмотр расписания (S-04).
        </Text>
        <Text style={styles.cardText}>
          Привязка домашних заданий к парам, канбан-доска и создание ДЗ старостой (S-07, S-12)
          запланированы на Итерацию 2 (03.11–17.11).
        </Text>
      </View>

      <View style={styles.previewCard}>
        <Text style={styles.previewTitle}>Скоро здесь будет:</Text>
        <Text style={styles.bulletItem}>• Просмотр ДЗ по конкретным парам расписания</Text>
        <Text style={styles.bulletItem}>• Дедлайны сдачи и фильтр по предметам</Text>
        {user.role === "elder" || user.role === "helper" ? (
          <Text style={styles.bulletItem}>
            • Кнопка «+ Добавить ДЗ» для старост и хелперов группы
          </Text>
        ) : null}
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
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
    marginBottom: 6,
  },
  previewCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e40af",
    marginBottom: 8,
  },
  bulletItem: {
    fontSize: 13,
    color: "#1e3a8a",
    lineHeight: 22,
  },
});
