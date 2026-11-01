import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View, ScrollView } from "react-native";

export default function App(): React.JSX.Element {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Zeta</Text>
      <Text style={styles.subtitle}>Мобильное приложение · Итерация 1</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Статус входа</Text>
        <Text style={styles.text}>Авторизован (Telegram ID: student_123)</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Расписание группы</Text>
        <Text style={styles.dayHeader}>Понедельник</Text>
        <Text style={styles.text}>09:00 — Математический анализ</Text>
        <Text style={styles.text}>10:40 — Алгоритмы и структуры данных</Text>
      </View>

      <StatusBar style="auto" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: "#ffffff",
    alignItems: "stretch",
    justifyContent: "flex-start",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#171717",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    marginBottom: 24,
  },
  card: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#171717",
    marginBottom: 8,
  },
  dayHeader: {
    fontSize: 15,
    fontWeight: "500",
    color: "#262626",
    marginTop: 4,
    marginBottom: 6,
  },
  text: {
    fontSize: 14,
    color: "#525252",
    marginBottom: 4,
  },
});
