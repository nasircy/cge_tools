import { useEffect, useState } from "react";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Field from "../ui/Field";
import { pushToast } from "../ui/toast-store";
import type { GeneratedFileFormat, GeneratedFiles } from "../../lib/generate";
import { envelopePayloadSchema } from "../../lib/schemas";

interface EnvelopeRow {
  readonly id: string;
  readonly name: string;
  readonly award: string;
}

let rowCounter = 0;

function createRow(): EnvelopeRow {
  rowCounter += 1;
  return { id: `envelope-${rowCounter}`, name: "", award: "優等" };
}

export default function EnvelopeForm() {
  const [eventName, setEventName] = useState("");
  const [competitionName, setCompetitionName] = useState("");
  const [rows, setRows] = useState<readonly EnvelopeRow[]>(() => [createRow()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [output, setOutput] = useState<GeneratedFiles | null>(null);


  useEffect(() => {
    setOutput(null);
  }, [eventName, competitionName, rows]);

  const updateRow = (id: string, field: Exclude<keyof EnvelopeRow, "id">, value: string): void => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const handleGenerate = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const parsed = envelopePayloadSchema.safeParse({
        eventName,
        competitionName,
        recipients: rows.map((row) => ({ name: row.name, award: row.award })),
      });
      if (!parsed.success) {
        const message = parsed.error.issues[0]?.message ?? "欄位驗證失敗";
        setError(message);
        pushToast("error", message);
        return;
      }

      const payload = parsed.data;
      const { generateEnvelopeFiles } = await import("../../lib/generate");
      const files = await generateEnvelopeFiles(payload);

      setOutput(files);
      pushToast("success", `已產生 ${payload.recipients.length} 份紅包袋`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "紅包袋產生失敗";
      setError(message);
      pushToast("error", message);
    } finally {
      setBusy(false);
    }
  };

  const download = async (format: GeneratedFileFormat): Promise<void> => {
    if (!output) return;
    try {
      const { downloadGeneratedFiles } = await import("../../lib/generate");
      await downloadGeneratedFiles(output, format);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "下載失敗";
      pushToast("error", message);
    }
  };

  const downloadDocx = (): void => {
    void download("docx");
  };

  const downloadZip = (): void => {
    void download("zip");
  };

  return (
    <fieldset disabled={busy} className="min-w-0 space-y-6">
      {error ? (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-panel border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      ) : null}

      <Card title="基本資料" subtitle="活動名稱與比賽子項目會套用到每一份紅包袋">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="活動總名稱"
            type="text"
            value={eventName}
            onChange={(event) => setEventName(event.target.value)}
            placeholder="列印在紅包袋上的科目或活動名稱"
            hint="可自由修改，會直接套用到紅包袋"
          />
          <Field label="比賽子項目（選填）" value={competitionName} onChange={(event) => setCompetitionName(event.target.value)} placeholder="例如：散文創作獎" hint="文學季可填八項比賽之一；一般活動可留白" />
        </div>
      </Card>

      <Card
        title="得獎者"
        subtitle={`共 ${rows.length} 位`}
        action={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={rows.length >= 200}
            onClick={() => setRows((current) => [...current, createRow()])}
          >
            新增一列
          </Button>
        }
      >
        <div className="space-y-4">
          {rows.map((row, index) => (
            <div key={row.id} className="rounded-panel border border-[var(--border)] bg-[var(--surface-soft)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--ink)]">第 {index + 1} 位</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={rows.length === 1}
                  onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
                >
                  移除
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="姓名"
                  type="text"
                  inputMode="text"
                  value={row.name}
                  onChange={(event) => updateRow(row.id, "name", event.target.value)}
                />
                <Field
                  label="等第"
                  value={row.award}
                  onChange={(event) => updateRow(row.id, "award", event.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button type="button" loading={busy} onClick={handleGenerate}>
          產生紅包袋
        </Button>
        <Button type="button" variant="secondary" disabled={!output} onClick={downloadDocx}>
          下載 DOCX
        </Button>
        <Button type="button" variant="secondary" disabled={!output} onClick={downloadZip}>
          下載 ZIP
        </Button>
      </div>

      {output && <p role="status" className="font-medium">已產生 {rows.length} 份紅包袋，可下載 Word 檔案。</p>}
    </fieldset>
  );
}
