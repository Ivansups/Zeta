import { AppShell } from "@/components/app-shell";
import { ScheduleDashboard } from "@/components/schedule-dashboard";

export default function Home(): React.JSX.Element {
  return (
    <AppShell active="schedule">
      <ScheduleDashboard />
    </AppShell>
  );
}
