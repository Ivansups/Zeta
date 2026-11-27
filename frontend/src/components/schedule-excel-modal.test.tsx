import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { api } from "@/lib/api";
import { apiPair } from "@/lib/test-fixtures";
import { ScheduleExcelModal } from "./schedule-excel-modal";

jest.mock("@/lib/api", () => ({
  api: {
    parseScheduleWorkbook: jest.fn(),
    importScheduleWorkbook: jest.fn(),
    createSchedulePair: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe("ScheduleExcelModal", () => {
  const onImportComplete = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("handles file upload, parses ambiguous cells and allows manual resolution", async () => {
    const user = userEvent.setup();

    mockedApi.parseScheduleWorkbook.mockResolvedValue({
      lessons: [
        {
          course: 2,
          direction: "09.03.01",
          program: null,
          group: "БПИ-211",
          subgroup: 1,
          day_of_week: "Понедельник",
          pair_number: 1,
          start_time: "08:30",
          end_time: "10:05",
          week_parity: "both",
          subject: "Математический анализ",
          teacher: "Иванов И.И.",
          is_online: false,
          lesson_type: "lecture",
          notes: [],
          parsed_by: "regex",
        },
      ],
      unresolved_cells: [
        {
          raw_text: "Спецкурс / проф. Смирнов",
          course: 2,
          group: "БПИ-211",
          day_of_week: "Понедельник",
          pair_number: 2,
          start_time: "10:15",
          end_time: "11:50",
          week_parity: "numerator",
        },
      ],
      total_cells_processed: 2,
      regex_parsed_count: 1,
      llm_parsed_count: 0,
      unresolved_count: 1,
    });
    mockedApi.importScheduleWorkbook.mockResolvedValue({
      groups_processed: 1,
      pairs_saved: 1,
    });
    mockedApi.createSchedulePair.mockResolvedValue(apiPair({ id: "mock-pair" }));

    render(
      <ScheduleExcelModal
        open={true}
        groupId="test-group-id"
        onClose={onClose}
        onImportComplete={onImportComplete}
      />,
    );

    expect(screen.getByText("Загрузка из Excel (.xlsx)")).toBeInTheDocument();

    // Upload file
    const file = new File(["dummy content"], "schedule.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const fileInput = screen.getByLabelText(/Выбрать .xlsx файл/i, { selector: "input" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Expect ambiguous cell to be shown
    expect(
      await screen.findByText(/Спорные \/ нераспознанные ячейки \(1\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Спецкурс \/ проф\. Смирнов/i)).toBeInTheDocument();

    // Resolve the ambiguous cell
    const resolveBtn = screen.getByRole("button", { name: /Добавить в расписание/i });
    await user.click(resolveBtn);

    // Now all cells should be resolved
    expect(
      await screen.findByText("Все ячейки таблицы успешно распознаны!"),
    ).toBeInTheDocument();

    // Final import
    const saveBtn = screen.getByRole("button", {
      name: "Сохранить в расписание группы",
    });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(mockedApi.importScheduleWorkbook).toHaveBeenCalledWith(file);
      expect(mockedApi.createSchedulePair).toHaveBeenCalledWith(
        expect.objectContaining({
          group_id: "test-group-id",
          subject: "Спецкурс / проф. Смирнов",
          day_of_week: "Понедельник",
          pair_number: 2,
        }),
      );
      expect(onImportComplete).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
