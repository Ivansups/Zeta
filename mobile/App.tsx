import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Subgroup, TabName, User } from "./src/types";
import { LoginScreen } from "./src/components/LoginScreen";
import { ScheduleScreen } from "./src/components/ScheduleScreen";
import { HomeworkScreen } from "./src/components/HomeworkScreen";
import { ProfileScreen } from "./src/components/ProfileScreen";
import { TabBar } from "./src/components/TabBar";
import { api } from "./src/services/api";

export default function App(): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabName>("schedule");
  const [subgroup, setSubgroup] = useState<Subgroup>(1);

  const handleLoginSuccess = (loggedInUser: User): void => {
    setUser(loggedInUser);
    setSubgroup(loggedInUser.subgroup);
    setActiveTab("schedule");
  };

  const handleLogout = async (): Promise<void> => {
    await api.logout();
    setUser(null);
    setActiveTab("schedule");
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {activeTab === "schedule" && (
          <ScheduleScreen
            user={user}
            subgroup={subgroup}
            onSubgroupChange={setSubgroup}
          />
        )}
        {activeTab === "homework" && <HomeworkScreen user={user} />}
        {activeTab === "profile" && (
          <ProfileScreen user={user} onLogout={handleLogout} />
        )}
      </View>
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    flex: 1,
  },
});
