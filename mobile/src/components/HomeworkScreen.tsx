import React from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { User } from "../types";
import { theme } from "../theme/colors";

interface HomeworkScreenProps {
  user: User;
}

export function HomeworkScreen({ user }: HomeworkScreenProps): React.JSX.Element {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>Итерация 2 · В разработке</Text>
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
    backgroundColor: theme.colors.background,
    flexGrow: 1,
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
    marginBottom: 20,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.foreground,
    marginBottom: 8,
  },
  cardText: {
    fontSize: 13,
    color: theme.colors.mutedStrong,
    lineHeight: 19,
    marginBottom: 6,
  },
  previewCard: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radii.md,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.primaryStrong,
    marginBottom: 8,
  },
  bulletItem: {
    fontSize: 13,
    color: theme.colors.foreground,
    lineHeight: 22,
  },
});
