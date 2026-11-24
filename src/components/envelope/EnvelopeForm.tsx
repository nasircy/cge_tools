import { useEffect, useState } from "react";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Field from "../ui/Field";
import { pushToast } from "../ui/toast-store";
import type { GeneratedFileFormat, GeneratedFiles } from "../../lib/generate";
import { envelopePayloadSchema } from "../../lib/schemas";
import type { EnvelopePayload } from "../../lib/schemas";

interface EnvelopeRow {
  readonly id: string;
  readonly name: string;
  readonly award: string;
}

interface TemplateOption {
  readonly id: EnvelopePayload["templateId"];
  readonly label: string;
  readonly eventName: string;
  readonly award: string;
}


const templateOptions: readonly TemplateOption[] = [
  {
    id: "envelope-life",
    label: "生命教育紅包袋",
    eventName: "生命教育繪畫比賽",
    award: "優等",
  },
  {
    id: "envelope-literary",
    label: "北商文學季紅包袋",
    eventName: "北商文學季",
    award: "佳作",
  },
];

let rowCounter = 0;

function createRow(award: string): EnvelopeRow {
  rowCounter += 1;
  return { id: `envelope-${rowCounter}`, name: "", award };
}

export default function EnvelopeForm() {
  const [templateId, setTemplateId] = useState<EnvelopePayload["templateId"]>("envelope-life");
  const [eventName, setEventName] = useState(templateOptions[0]?.eventName ?? "");
  const [rows, setRows] = useState<readonly EnvelopeRow[]>(() => [createRow(templateOptions[0]?.award ?? "優等")]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [output, setOutput] = useState<GeneratedFiles | null>(null);


  useEffect(() => {
    setOutput(null);
  }, [templateId, eventName, rows]);

  const selectedOption = templateOptions.find((option) => option.id === templateId) ?? templateOptions[0];

  const selectTemplate = (nextTemplateId: EnvelopePayload["templateId"]): void => {
    const next = templateOptions.find((option) => option.id === nextTemplateId);
    if (!next) return;
    setTemplateId(next.id);
    setEventName((current) =>
      current === "" || templateOptions.some((option) => option.eventName === current)
        ? next.eventName
        : current,
    );
    setRows((current) =>
      current.map((row) =>
        templateOptions.some((option) => option.award === row.award)
          ? { ...row, award: next.award }
          : row,
      ),
    );
  };

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
        templateId,
        eventName,
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

      <Card title="模板選擇" subtitle="依活動選用對應的原始 Word 紅包袋版面">
        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset className="min-w-0">
            <legend className="mb-1.5 text-sm font-semibold text-[var(--ink)]">紅包袋版型</legend>
            <div className="grid grid-cols-2 gap-2">
              {templateOptions.map((option) => (
                <label
                  key={option.id}
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${templateId === option.id ? "border-navy bg-[var(--surface-soft)] font-semibold text-[var(--ink)]" : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink-muted)]"}`}
                >
                  <input
                    type="radio"
                    name="envelope-template"
                    value={option.id}
                    checked={templateId === option.id}
                    onChange={() => selectTemplate(option.id)}
                    className="shrink-0 accent-navy"
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field
            label="科目／活動名稱"
            type="text"
            value={eventName}
            onChange={(event) => setEventName(event.target.value)}
            placeholder="列印在紅包袋上的科目或活動名稱"
            hint="可自由修改，會直接套用到紅包袋"
          />
        </div>
      </Card>

      <Card
        title="得獎者"
        subtitle={`共 ${rows.length} 位，目前模板：${selectedOption?.label ?? ""}`}
        action={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={rows.length >= 100}
            onClick={() => setRows((current) => [...current, createRow(selectedOption?.award ?? "優等")])}
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

      <Card title="Word 檔案" subtitle="保留範例指定字型與版面，不另外加線條或邊框">
        <p className="text-sm leading-7 text-[var(--ink-muted)]">原稿字型：華康行書體。請使用已安裝該字型的 Word 開啟；工具不會擅自換字型。需要 PDF 時，請在 Word 中選擇「另存為 PDF」。</p>
        {output && <p role="status" className="mt-3 font-medium">已產生 {rows.length} 份紅包袋，可下載 Word 檔案。</p>}
      </Card>
    </fieldset>
  );
}
