import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ToastProvider, useToast } from "./toast";

function TestComponent() {
  const { showToast } = useToast();
  return (
    <div>
      <button type="button" onClick={() => showToast("Привет, мир!", 2000)}>
        Показать тост
      </button>
    </div>
  );
}

describe("Toast System", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("shows toast when showToast is called and hides it after duration", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>,
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Показать тост" }));

    expect(screen.getByRole("status")).toHaveTextContent("Привет, мир!");

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("provides safe fallback when useToast is called outside provider", () => {
    function FallbackComponent() {
      const { showToast } = useToast();
      return (
        <button type="button" onClick={() => showToast("Не упадет")}>
          Клик
        </button>
      );
    }

    render(<FallbackComponent />);
    expect(() => {
      screen.getByRole("button").click();
    }).not.toThrow();
  });
});
