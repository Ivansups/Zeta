"use client";

import { AlertCircle, Check, CheckCircle2, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { useState } from "react";

import {
  api,
  type ApiSchedulePairCreate,
  type ApiScheduleParseResult,
  type ApiUnresolvedCell,
} from "@/lib/api";

export type ScheduleExcelModalProps = {
  open: boolean;
  groupId?: string;
  onClose: () => void;
  onImportComplete: () => Promise<void>;
};

type ManualResolvedPair = ApiSchedulePairCreate & { id: string };

export function ScheduleExcelModal({
  open,
  groupId,
  onClose,
  onImportComplete,
}: ScheduleExcelModalProps): React.JSX.Element | null {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [parseResult, setParseResult] = useState<ApiScheduleParseResult | null>(null);
  const [unresolvedList, setUnresolvedList] = useState<ApiUnresolvedCell[]>([]);
  const [manuallyResolved, setManuallyResolved] = useState<ManualResolvedPair[]>([]);
  const [activeCellSubject, setActiveCellSubject] = useState<Record<number, string>>({});
  const [activeCellParity, setActiveCellParity] = useState<Record<number, string>>({});
  const [activeCellSubgroup, setActiveCellSubgroup] = useState<Record<number, number | null>>({});

  if (!open) {
    return null;
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setError("Пожалуйста, выберите файл в формате .xlsx");
      return;
    }

    setSelectedFile(file);
    setError("");
    setParsing(true);
    setParseResult(null);
    setUnresolvedList([]);
    setManuallyResolved([]);

    try {
      const result = await api.parseScheduleWorkbook(file);
      setParseResult(result);
      setUnresolvedList(result.unresolved_cells || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка при разборе Excel файла");
    } finally {
      setParsing(false);
    }
  }

  function handleResolveCell(index: number): void {
    const item = unresolvedList[index];
    if (!item) return;

    const subject = (activeCellSubject[index] || item.raw_text).trim();
    if (!subject) return;

    const parity = activeCellParity[index] || item.week_parity || "both";
    const subg = activeCellSubgroup[index] !== undefined ? activeCellSubgroup[index] : null;

    const resolved: ManualResolvedPair = {
      id: `manual-${index}-${Date.now()}`,
      group_id: groupId,
      day_of_week: item.day_of_week,
      pair_number: item.pair_number,
      start_time: item.start_time,
      end_time: item.end_time,
      week_parity: parity,
      subgroup: subg,
      subject,
      lesson_type: "practice",
    };

    setManuallyResolved((prev) => [...prev, resolved]);
    setUnresolvedList((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSkipCell(index: number): void {
    setUnresolvedList((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleFinalImport(): Promise<void> {
    if (!selectedFile) return;

    setSaving(true);
    setError("");

    try {
      // 1. Transactional batch import of recognized lessons from Excel
      await api.importScheduleWorkbook(selectedFile);

      // 2. Add manually resolved ambiguous cells
      if (manuallyResolved.length > 0) {
        for (const pair of manuallyResolved) {
          await api.createSchedulePair(pair).catch(() => null);
        }
      }

      await onImportComplete();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Не удалось импортировать расписание");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div
        className="modal-card"
        style={{ maxWidth: "680px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Импорт расписания</p>
            <h2>Загрузка из Excel (.xlsx)</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        {error ? (
          <div
            className="error-banner"
            style={{
              padding: "10px 14px",
              background: "rgba(239, 68, 68, 0.1)",
              color: "#dc2626",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <AlertCircle size={16} />
            {error}
          </div>
        ) : null}

        {!parseResult && !parsing ? (
          <div
            style={{
              border: "2px dashed var(--border-color, #e2e8f0)",
              borderRadius: "12px",
              padding: "32px 20px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              background: "var(--card-bg, #ffffff)",
            }}
          >
            <FileSpreadsheet size={40} strokeWidth={1.5} color="var(--primary, #3b82f6)" />
            <div>
              <p style={{ fontWeight: 600, marginBottom: "4px" }}>
                Выберите файл расписания в формате Excel
              </p>
              <p style={{ fontSize: "13px", color: "var(--muted, #64748b)" }}>
                Поддерживаются факультетские таблицы со сложной сеткой (числитель/знаменатель, подгруппы)
              </p>
            </div>
            <label
              className="button button-primary"
              style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px" }}
            >
              <Upload size={16} />
              Выбрать .xlsx файл
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </label>
          </div>
        ) : null}

        {parsing ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <Loader2
              size={36}
              className="animate-spin"
              style={{ margin: "0 auto 12px", color: "var(--primary, #3b82f6)" }}
            />
            <p style={{ fontWeight: 500 }}>Анализируем сетку расписания и ячейки…</p>
            <p style={{ fontSize: "13px", color: "var(--muted, #64748b)" }}>
              Распознаём предметы, преподавателей и аудитории
            </p>
          </div>
        ) : null}

        {parseResult ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "12px",
                background: "var(--surface-color, #f8fafc)",
                padding: "16px",
                borderRadius: "12px",
              }}
            >
              <div>
                <p style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>Распознано пар</p>
                <strong style={{ fontSize: "20px", color: "#16a34a" }}>
                  {parseResult.lessons.length}
                </strong>
              </div>
              <div>
                <p style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>Спорных ячеек</p>
                <strong style={{ fontSize: "20px", color: unresolvedList.length > 0 ? "#eab308" : "inherit" }}>
                  {unresolvedList.length}
                </strong>
              </div>
              <div>
                <p style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>Доразмечено вручную</p>
                <strong style={{ fontSize: "20px", color: "#2563eb" }}>
                  {manuallyResolved.length}
                </strong>
              </div>
            </div>

            {/* Блок «Спорные / нераспознанные ячейки» */}
            {unresolvedList.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <h3 style={{ fontSize: "15px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                    <AlertCircle size={16} color="#eab308" />
                    Спорные / нераспознанные ячейки ({unresolvedList.length})
                  </h3>
                  <span style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
                    Выберите предмет и параметры или пропустите
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "280px", overflowY: "auto" }}>
                  {unresolvedList.map((item, idx) => (
                    <div
                      key={`unresolved-${idx}-${item.raw_text}`}
                      style={{
                        padding: "12px",
                        border: "1px solid var(--border-color, #e2e8f0)",
                        borderRadius: "8px",
                        background: "var(--card-bg, #ffffff)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--primary, #3b82f6)" }}>
                          {item.day_of_week}, пара {item.pair_number} ({item.start_time}–{item.end_time})
                        </span>
                        <span style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
                          Группа: {item.group}
                        </span>
                      </div>
                      <p style={{ fontSize: "13px", background: "var(--surface-color, #f1f5f9)", padding: "6px 10px", borderRadius: "6px", marginBottom: "10px", fontStyle: "italic" }}>
                        Исходный текст: «{item.raw_text}»
                      </p>

                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                        <input
                          type="text"
                          className="input-text"
                          placeholder="Название предмета"
                          value={activeCellSubject[idx] !== undefined ? activeCellSubject[idx] : item.raw_text}
                          onChange={(e) =>
                            setActiveCellSubject((prev) => ({ ...prev, [idx]: e.target.value }))
                          }
                          style={{ padding: "6px 10px", fontSize: "13px" }}
                        />
                        <select
                          className="input-select"
                          value={activeCellParity[idx] || item.week_parity}
                          onChange={(e) =>
                            setActiveCellParity((prev) => ({ ...prev, [idx]: e.target.value }))
                          }
                          style={{ padding: "6px 10px", fontSize: "13px" }}
                        >
                          <option value="both">Обе недели</option>
                          <option value="numerator">Числитель</option>
                          <option value="denominator">Знаменатель</option>
                        </select>
                        <select
                          className="input-select"
                          value={activeCellSubgroup[idx] ?? "all"}
                          onChange={(e) =>
                            setActiveCellSubgroup((prev) => ({
                              ...prev,
                              [idx]: e.target.value === "all" ? null : Number(e.target.value),
                            }))
                          }
                          style={{ padding: "6px 10px", fontSize: "13px" }}
                        >
                          <option value="all">Вся группа</option>
                          <option value="1">Подгруппа 1</option>
                          <option value="2">Подгруппа 2</option>
                        </select>
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => handleSkipCell(idx)}
                          style={{ padding: "4px 10px", fontSize: "12px" }}
                        >
                          Пропустить
                        </button>
                        <button
                          type="button"
                          className="button button-primary"
                          onClick={() => handleResolveCell(idx)}
                          style={{ padding: "4px 10px", fontSize: "12px" }}
                        >
                          <Check size={14} />
                          Добавить в расписание
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px",
                  background: "rgba(34, 197, 94, 0.1)",
                  color: "#16a34a",
                  borderRadius: "8px",
                  fontSize: "14px",
                }}
              >
                <CheckCircle2 size={18} />
                Все ячейки таблицы успешно распознаны!
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => {
                  setParseResult(null);
                  setSelectedFile(null);
                }}
                disabled={saving}
              >
                Выбрать другой файл
              </button>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={onClose}
                  disabled={saving}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={handleFinalImport}
                  disabled={saving}
                >
                  {saving ? "Импортируем…" : "Сохранить в расписание группы"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
