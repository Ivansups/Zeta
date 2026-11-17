import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import App from "./App";

// Enable React act environment for testing
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("Mobile App (Zeta) - Iteration 1 & 2", () => {
  it("renders login screen initially with Telegram button", async () => {
    await render(<App />);

    expect(screen.getByText("Zeta")).toBeTruthy();
    expect(screen.getByText("Система учёта домашних заданий ФКН")).toBeTruthy();
    expect(screen.getByText("Войти через Telegram")).toBeTruthy();
  });

  it("logs in successfully and shows schedule screen", async () => {
    await render(<App />);

    const loginButton = screen.getByTestId("login-button");
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(screen.getByText(/Группа ИУ5-11Б/)).toBeTruthy();
      expect(screen.getByText(/Иван Иванов/)).toBeTruthy();
    });

    // Расписание по умолчанию на понедельник
    await waitFor(() => {
      expect(screen.getByText("Математический анализ")).toBeTruthy();
      expect(screen.getByText("Программирование на C++ (Лаб)")).toBeTruthy();
    });
  });

  it("switches subgroup and updates schedule pairs", async () => {
    await render(<App />);

    fireEvent.press(screen.getByTestId("login-button"));

    await waitFor(() => {
      expect(screen.getByText(/Группа ИУ5-11Б/)).toBeTruthy();
    });

    // Переключаем на подгруппу 2
    const subgroup2Btn = screen.getByTestId("subgroup-btn-2");
    fireEvent.press(subgroup2Btn);

    await waitFor(() => {
      // Для подгруппы 2 вместо C++ должен быть Иностранный язык
      expect(screen.getByText("Иностранный язык")).toBeTruthy();
      expect(screen.queryByText("Программирование на C++ (Лаб)")).toBeNull();
    });
  });

  it("displays homework badges and week-strip dots in schedule (S-07)", async () => {
    await render(<App />);

    fireEvent.press(screen.getByTestId("login-button"));

    await waitFor(() => {
      expect(screen.getByText(/Группа ИУ5-11Б/)).toBeTruthy();
    });

    // Проверяем наличие индикатора ДЗ на понедельнике
    await waitFor(() => {
      expect(screen.getByTestId("hw-dot-monday")).toBeTruthy();
    });

    // Проверяем отображение бейджа ДЗ на карточке матанализа
    await waitFor(() => {
      expect(
        screen.getByText("📝 ДЗ: № 14.1–14.8 из задачника Демидовича")
      ).toBeTruthy();
    });
  });

  it("displays homework list with deadlines and filters by subgroup (S-07)", async () => {
    await render(<App />);

    fireEvent.press(screen.getByTestId("login-button"));

    await waitFor(() => {
      expect(screen.getByText(/Группа ИУ5-11Б/)).toBeTruthy();
    });

    // Переключаемся на вкладку ДЗ
    fireEvent.press(screen.getByTestId("tab-homework"));

    await waitFor(() => {
      expect(screen.getByText("Домашние задания")).toBeTruthy();
      expect(screen.getByText("Демидович: ряды Тейлора")).toBeTruthy();
      expect(
        screen.getByText("Лабораторная 3: Красно-чёрное дерево")
      ).toBeTruthy();
    });

    // Переключаем подгруппу на 2
    fireEvent.press(screen.getByTestId("hw-subgroup-btn-2"));

    await waitFor(() => {
      expect(screen.getByText("Unit 4: Technical Presentation")).toBeTruthy();
      expect(
        screen.queryByText("Лабораторная 3: Красно-чёрное дерево")
      ).toBeNull();
    });
  });

  it("switches tabs between schedule, homework and profile", async () => {
    await render(<App />);

    fireEvent.press(screen.getByTestId("login-button"));

    await waitFor(() => {
      expect(screen.getByText(/Группа ИУ5-11Б/)).toBeTruthy();
    });

    // Переключаемся на вкладку ДЗ
    fireEvent.press(screen.getByTestId("tab-homework"));
    await waitFor(() => {
      expect(screen.getByText("Домашние задания")).toBeTruthy();
    });

    // Переключаемся на вкладку Профиль
    fireEvent.press(screen.getByTestId("tab-profile"));
    await waitFor(() => {
      expect(screen.getByText("Telegram ID")).toBeTruthy();
      expect(screen.getByText("student_101")).toBeTruthy();
      expect(screen.getByText("Выйти из аккаунта")).toBeTruthy();
    });
  });

  it("logs out and returns to login screen", async () => {
    await render(<App />);

    fireEvent.press(screen.getByTestId("login-button"));

    await waitFor(() => {
      expect(screen.getByText(/Группа ИУ5-11Б/)).toBeTruthy();
    });

    // Идём в профиль и жмём выход
    fireEvent.press(screen.getByTestId("tab-profile"));

    await waitFor(() => {
      expect(screen.getByTestId("logout-button")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("logout-button"));

    await waitFor(() => {
      expect(screen.getByText("Войти через Telegram")).toBeTruthy();
      expect(screen.queryByText(/Группа ИУ5-11Б/)).toBeNull();
    });
  });
});
