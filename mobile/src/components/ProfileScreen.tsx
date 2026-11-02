import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from "react-native";
import { User } from "../types";

interface ProfileScreenProps {
  user: User;
  onLogout: () => void;
}

export function ProfileScreen({ user, onLogout }: ProfileScreenProps): React.JSX.Element {
  return (
    <ScrollView contentContainerStyle={styles.container}>
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
    backgroundColor: "#f8fafc",
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 20,
  },
  avatarCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#bfdbfe",
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2563eb",
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  userHandle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: "#64748b",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
  },
  logoutButton: {
    backgroundColor: "#fee2e2",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#dc2626",
  },
});
