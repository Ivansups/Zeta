import { AppShell } from "@/components/app-shell";
import { ThemeSettings } from "@/components/theme-settings";

export default function SettingsPage(): React.JSX.Element {
  return (
    <AppShell active="settings">
      <ThemeSettings />
    </AppShell>
  );
}
