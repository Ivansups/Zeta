import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from "react-native";
import { User } from "../types";
import { api } from "../services/api";
import { theme } from "../theme/colors";

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps): React.JSX.Element {
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedProfile, setSelectedProfile] = useState<string>("student_1");

  const handleLogin = async (): Promise<void> => {
    setLoading(true);
    try {
      const user = await api.loginWithTelegram(selectedProfile);
      onLoginSuccess(user);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.brandMark}>
          <Text style={styles.brandLetter}>Z</Text>
        </View>
        <Text style={styles.logo}>Zeta</Text>
        <Text style={styles.subtitle}>Система учёта домашних заданий ФКН</Text>
        <Text style={styles.caption}>Вход осуществляется через Telegram аккаунт</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Выберите тестовый профиль:</Text>

        <TouchableOpacity
          style={[styles.profileButton, selectedProfile === "student_1" && styles.profileButtonActive]}
          onPress={() => setSelectedProfile("student_1")}
          testID="profile-student-1"
        >
          <Text style={[styles.profileText, selectedProfile === "student_1" && styles.profileTextActive]}>
            Студент: Иван (Подгруппа 1)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.profileButton, selectedProfile === "student_2" && styles.profileButtonActive]}
          onPress={() => setSelectedProfile("student_2")}
          testID="profile-student-2"
        >
          <Text style={[styles.profileText, selectedProfile === "student_2" && styles.profileTextActive]}>
            Студентка: Анна (Подгруппа 2)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.profileButton, selectedProfile === "elder" && styles.profileButtonActive]}
          onPress={() => setSelectedProfile("elder")}
          testID="profile-elder"
        >
          <Text style={[styles.profileText, selectedProfile === "elder" && styles.profileTextActive]}>
            Староста группы: Алексей
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.telegramButton}
          onPress={handleLogin}
          disabled={loading}
          testID="login-button"
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.telegramButtonText}>Войти через Telegram</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Мобильное приложение Zeta · Единая дизайн-система</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 80,
    justifyContent: "space-between",
    backgroundColor: theme.colors.background,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.foreground,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  brandLetter: {
    color: theme.colors.surface,
    fontSize: 26,
    fontWeight: "800",
  },
  logo: {
    fontSize: 32,
    fontWeight: "800",
    color: theme.colors.foreground,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.foreground,
    marginTop: 6,
    textAlign: "center",
  },
  caption: {
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 4,
    textAlign: "center",
  },
  card: {
    padding: 20,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.mutedStrong,
    marginBottom: 12,
  },
  profileButton: {
    padding: 12,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.surfaceMuted,
    marginBottom: 10,
  },
  profileButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  profileText: {
    fontSize: 14,
    color: theme.colors.foreground,
    fontWeight: "500",
  },
  profileTextActive: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  telegramButton: {
    marginTop: 14,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: theme.radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  telegramButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.muted,
  },
});
