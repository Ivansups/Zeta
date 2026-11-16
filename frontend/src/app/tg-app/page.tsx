import type { Metadata } from "next";

import { TelegramMiniApp } from "@/components/telegram-mini-app";

export const metadata: Metadata = {
  title: "Zeta Mini App",
  description: "Расписание и домашние задания ФКН внутри Telegram.",
};

export default function TgAppPage(): React.JSX.Element {
  return <TelegramMiniApp />;
}
