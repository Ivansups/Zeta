import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from "react-native";
import { User } from "../types";
import { theme } from "../theme/colors";

interface ProfileScreenProps {
  user: User;
  onLogout: () => void;
}

export function ProfileScreen({ user, onLogout }: ProfileScreenProps): React.JSX.Element {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>Учётная запись</Text>
      <Text style={styles.title}>Профиль</Text>

      <View style={styles.avatarCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitials}>
            {user.firstName[0]}
            {user.lastName ? user.lastName[0] : ""}
          </Text>
        </View>
        <Text style={styles.userName}>
          {user.firstName} {user.lastName ?? ""}
        </Text>
        {user.username ? <Text style={styles.userHandle}>@{user.username}</Text> : null}
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Telegram ID</Text>
          <Text style={styles.infoValue}>{user.telegramId}</Text>
        </View>
        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Группа</Text>
          <Text style={styles.infoValue}>{user.groupName}</Text>
        </View>
        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Основная подгруппа</Text>
          <Text style={styles.infoValue}>Подгруппа {user.subgroup}</Text>
        </View>
        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Роль в системе</Text>
          <Text style={styles.infoValue}>
            {user.role === "elder"
              ? "Староста"
              : user.role === "helper"
              ? "Помощник"
              : user.role === "curator"
              ? "Куратор"
              : "Студент"}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={onLogout} testID="logout-button">
        <Text style={styles.logoutText}>Выйти из аккаунта</Text>
      </TouchableOpacity>
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
    marginBottom: 16,
  },
  avatarCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  userName: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.foreground,
  },
  userHandle: {
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: theme.colors.muted,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.foreground,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.borderSoft,
  },
  logoutButton: {
    backgroundColor: theme.colors.dangerSoft,
    borderRadius: theme.radii.md,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.danger,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.danger,
  },
});
