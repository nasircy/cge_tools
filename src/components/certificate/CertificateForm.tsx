import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Field from "../ui/Field";
import { pushToast } from "../ui/toast-store";
import type { GeneratedFileFormat, GeneratedFiles } from "../../lib/generate";
import { createSerials } from "../../lib/serial";
import { certificatePayloadSchema } from "../../lib/schemas";
import type { CertificatePayload } from "../../lib/schemas";

interface RecipientRow {
  readonly id: string;
  readonly name: string;
  readonly deptClass: string;
  readonly studentId: string;
  readonly award: string;
}

const MAX_SIGNATURE_BYTES = 120 * 1024;

let rowCounter = 0;

function createRecipientRow(): RecipientRow {
  rowCounter += 1;
  return {
    id: `recipient-${rowCounter}`,
    name: "",
    deptClass: "",
    studentId: "",
    award: "第一名",
  };
}

function todayIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export default function CertificateForm() {
  const [eventName, setEventName] = useState("");
  const [date, setDate] = useState(todayIso);
  const [signerTitle, setSignerTitle] = useState("通識中心主任");
  const [signerImage, setSignerImage] = useState<string | undefined>();
  const [rows, setRows] = useState<readonly RecipientRow[]>(() => [createRecipientRow()]);
  const [startSequence, setStartSequence] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [output, setOutput] = useState<GeneratedFiles | null>(null);
  const serialPreview = useMemo(() => {
    try {
      return createSerials(date, Number(startSequence), rows.length);
    } catch {
      return null;
    }
  }, [date, startSequence, rows.length]);

  useEffect(() => {
    setOutput(null);
  }, [eventName, date, signerTitle, signerImage, rows, startSequence]);

  const updateRow = (id: string, field: Exclude<keyof RecipientRow, "id">, value: string): void => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const handleSignerImage = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      pushToast("error", "簽章圖只支援 PNG 或 JPEG");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_SIGNATURE_BYTES) {
      pushToast("error", "簽章圖請小於 120 KB");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setSignerImage(reader.result);
    };
    reader.onerror = () => pushToast("error", "無法讀取簽章圖，請重新選取");
    reader.readAsDataURL(file);
  };

  const handleGenerate = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const parsed = certificatePayloadSchema.safeParse({
        eventName,
        date,
        signerTitle,
        signerImage,
        recipients: rows.map((row) => ({
          name: row.name,
          deptClass: row.deptClass,
          studentId: row.studentId,
          award: row.award,
        })),
      });
      if (!parsed.success) {
        const message = parsed.error.issues[0]?.message ?? "欄位驗證失敗";
        setError(message);
        pushToast("error", message);
        return;
      }

      const basePayload: CertificatePayload = parsed.data;
      const serials = createSerials(basePayload.date, Number(startSequence), basePayload.recipients.length);
      const payload: CertificatePayload = { ...basePayload, serials: [...serials] };

      const { generateCertificateFiles } = await import("../../lib/generate");
      const files = await generateCertificateFiles(payload, serials);

      setOutput(files);
      pushToast("success", `已產生 ${payload.recipients.length} 份獎狀`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "獎狀產生失敗";
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

      <Card title="基本資料" subtitle="科目／活動名稱、製發日期與署名會套用到每一張獎狀">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="科目／活動名稱" type="text" value={eventName} onChange={(event) => setEventName(event.target.value)} placeholder="請輸入科目或活動名稱" hint="可自由修改，會直接套用至獎狀原稿的科目／活動位置" />
          <Field label="獎狀製發日期" type="date" value={date} onInput={(event) => setDate(event.currentTarget.value)} onChange={(event) => setDate(event.target.value)} hint="字號日期與獎狀落款日期均依此日期產生" />
          <Field label="流水號起號" type="number" min="1" max="9999" step="1" value={startSequence} onChange={(event) => setStartSequence(event.target.value)} hint="依製發日期組合民國年月日及四位序號；不同批次請自行調整起號" />
          <Field label="署名職稱" value={signerTitle} onChange={(event) => setSignerTitle(event.target.value)} />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-[var(--ink)]">簽章圖（選用）</span>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleSignerImage}
              className="block w-full text-sm text-[var(--ink-muted)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--accent)] file:px-3 file:py-2 file:text-white"
            />
            <span className="text-sm text-[var(--ink-muted)]">PNG/JPEG，小於 120 KB；只在本機使用</span>
            {signerImage && <span className="flex items-center gap-3"><img src={signerImage} alt="已選取的簽章圖" className="h-12 max-w-40 object-contain" /><button type="button" onClick={() => setSignerImage(undefined)} className="text-sm underline">移除簽章</button></span>}
          </label>
        </div>
        <p className="mt-4 text-sm leading-7 text-[var(--ink-muted)]" aria-live="polite" aria-atomic="true">
          {serialPreview ? <>
            字號預覽：北商大通字第{serialPreview[0]}號
            {serialPreview.length > 1 && <> ～ 北商大通字第{serialPreview[serialPreview.length - 1]}號</>}
          </> : "請填寫有效的製發日期及流水號起號以預覽字號。"}
        </p>
      </Card>

      <Card
        title="得獎者"
        subtitle={`共 ${rows.length} 位，每位會分配一個流水號`}
        action={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={rows.length >= 100}
            onClick={() => setRows((current) => [...current, createRecipientRow()])}
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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="姓名" type="text" inputMode="text" value={row.name} onChange={(event) => updateRow(row.id, "name", event.target.value)} hint="可輸入中文、英文或其他文字" />
                <Field label="科系班級" value={row.deptClass} onChange={(event) => updateRow(row.id, "deptClass", event.target.value)} placeholder="例：五專會資三甲" />
                <Field label="學號" type="text" inputMode="text" autoComplete="off" value={row.studentId} onChange={(event) => updateRow(row.id, "studentId", event.target.value)} hint="不限位數，可含英文字母；保留前導零" />
                <Field label="獎項" value={row.award} onChange={(event) => updateRow(row.id, "award", event.target.value)} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button type="button" loading={busy} onClick={handleGenerate}>
          產生獎狀
        </Button>
        <Button type="button" variant="secondary" disabled={!output} onClick={downloadDocx}>
          下載 DOCX
        </Button>
        <Button type="button" variant="secondary" disabled={!output} onClick={downloadZip}>
          下載 ZIP
        </Button>
      </div>

      <Card title="Word 檔案" subtitle="保留範例指定字型與版面，不另外加線條或邊框">
        <p className="text-sm leading-7 text-[var(--ink-muted)]">原稿字型：標楷體。請使用已安裝該字型的 Word 開啟；工具不會擅自換字型。需要 PDF 時，請在 Word 中選擇「另存為 PDF」。</p>
        {output && <p role="status" className="mt-3 font-medium">已產生 {rows.length} 份獎狀，可下載 Word 檔案。</p>}
      </Card>
    </fieldset>
  );
}
