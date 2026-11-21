import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { darkColors, lightColors } from "../theme";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Zeta — расписание и задания",
    template: "%s · Zeta",
  },
  description: "Расписание и домашние задания студентов ФКН в одном месте.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: lightColors.background },
    { media: "(prefers-color-scheme: dark)", color: darkColors.background },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
