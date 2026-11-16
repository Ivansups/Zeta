import { StatusBar } from "expo-status-bar";

import { samplePairs } from "./src/data/sample-schedule";
import { ScheduleScreen } from "./src/screens/schedule-screen";
import { getSessionFromEnv } from "./src/session";

export default function App(): React.JSX.Element {
  const session = getSessionFromEnv();

  return (
    <>
      <StatusBar style="dark" />
      <ScheduleScreen
        role={session.role}
        token={session.token}
        initialPairs={samplePairs}
      />
    </>
  );
}
