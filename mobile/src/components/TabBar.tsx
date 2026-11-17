import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { TabName } from "../types";
import { theme } from "../theme/colors";

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
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSoft,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: "space-around",
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radii.sm,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.primarySoft,
  },
  tabText: {
    fontSize: 12,
    color: theme.colors.muted,
    fontWeight: "500",
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: "700",
  },
});
