import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { TabName } from "../types";

interface TabBarProps {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
}

export function TabBar({ activeTab, onTabChange }: TabBarProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === "schedule" && styles.tabButtonActive]}
        onPress={() => onTabChange("schedule")}
        testID="tab-schedule"
      >
        <Text style={[styles.tabText, activeTab === "schedule" && styles.tabTextActive]}>
          📅 Расписание
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabButton, activeTab === "homework" && styles.tabButtonActive]}
        onPress={() => onTabChange("homework")}
        testID="tab-homework"
      >
        <Text style={[styles.tabText, activeTab === "homework" && styles.tabTextActive]}>
          📝 Задания
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabButton, activeTab === "profile" && styles.tabButtonActive]}
        onPress={() => onTabChange("profile")}
        testID="tab-profile"
      >
        <Text style={[styles.tabText, activeTab === "profile" && styles.tabTextActive]}>
          👤 Профиль
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: "space-around",
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: "#eff6ff",
  },
  tabText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#2563eb",
    fontWeight: "700",
  },
});
