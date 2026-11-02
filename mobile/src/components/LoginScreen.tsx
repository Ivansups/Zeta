import React, { useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from "react-native";
import { User } from "../types";
import { api } from "../services/api";

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
        <Text style={styles.footerText}>Мобильное приложение Zeta · Итерация 1</Text>
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
    backgroundColor: "#ffffff",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    fontSize: 40,
    fontWeight: "800",
    color: "#2563eb",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginTop: 8,
    textAlign: "center",
  },
  caption: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
    textAlign: "center",
  },
  card: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 12,
  },
  profileButton: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
    marginBottom: 10,
  },
  profileButtonActive: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  profileText: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "500",
  },
  profileTextActive: {
    color: "#2563eb",
    fontWeight: "600",
  },
  telegramButton: {
    marginTop: 14,
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  telegramButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: "#94a3b8",
  },
});
