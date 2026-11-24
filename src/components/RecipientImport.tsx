import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Button from "./ui/Button";
import { createBlob, downloadBlob } from "../lib/download";
import { pushToast } from "./ui/toast-store";
import type { ImportKind, ImportedRecipient } from "../lib/recipient-import";

interface Props {
  kind: ImportKind;
  existingCount: number;
  onApply: (rows: ImportedRecipient[], append: boolean) => void;
}
export default function RecipientImport({ kind, existingCount, onApply }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const request = useRef(0);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<ImportedRecipient[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { request.current++; setPending(null); setError(""); setLoading(false); return () => { request.current++; }; }, [kind]);
  const downloadTemplate = async (format: "xlsx" | "csv") => {
    try {
      const { createImportTemplate } = await import("../lib/recipient-import");
      const name = kind === "general" ? "通用獎狀" : kind === "literature" ? "文學季獎狀" : "紅包袋";
      downloadBlob(createBlob(createImportTemplate(kind, format), format === "csv" ? "text/csv;charset=utf-8" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"), `${name}_得獎者範本.${format}`);
    } catch { setError("範本下載失敗，請重新嘗試"); }
  };
  const selectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const token = ++request.current;
    setLoading(true); setError(""); setPending(null);
    try {
      const { readRecipientFile } = await import("../lib/recipient-import");
      const rows = await readRecipientFile(file, kind);
      if (request.current === token) setPending(rows);
    } catch (cause) {
      if (request.current === token) setError(cause instanceof Error ? cause.message : "無法匯入，請檢查檔案內容");
    } finally { if (request.current === token) setLoading(false); }
  };
  const apply = (append: boolean) => {
    if (!pending) return;
    const incomingCount = kind === "envelope" ? pending.reduce((sum, row) => sum + row.quantity, 0) : pending.length;
    if (append && existingCount + incomingCount > 200) { setError("加入後超過 200 頁，請分批製作，或選擇取代名單"); return; }
    onApply(pending, append); setPending(null); setError("");
    pushToast("success", `已匯入 ${pending.length} 筆名單`);
  };
  return <div className="mb-5 space-y-3 border-b border-[var(--border)] pb-5">
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="secondary" size="sm" onClick={() => void downloadTemplate("xlsx")}>下載 Excel 範本</Button>
      <Button type="button" variant="secondary" size="sm" onClick={() => void downloadTemplate("csv")}>下載 CSV 範本</Button>
      <Button type="button" variant="secondary" size="sm" loading={loading} onClick={() => input.current?.click()}>匯入 Excel／CSV</Button>
      <input ref={input} type="file" accept=".xlsx,.csv" className="hidden" aria-label="選擇得獎者名單" onChange={event => void selectFile(event)} />
    </div>
    <p className="text-sm text-[var(--ink-muted)]">填好範本後匯入，確認名單再套用。{kind === "general" && "學號請以文字填寫；未填的欄位可在下方補上。"}</p>
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
    {pending && <div className="space-y-3">
      <p className="text-sm font-semibold" role="status">已讀取 {pending.length} 筆{kind === "envelope" && `，合計 ${pending.reduce((sum, row) => sum + row.quantity, 0)} 份`}，請確認後套用{pending.length > 5 ? "（預覽前 5 筆）" : ""}。</p>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-[var(--border)]"><th className="p-2">姓名</th>{kind !== "envelope" && <th className="p-2">科系班級</th>}{kind === "general" && <th className="p-2">學號</th>}<th className="p-2">等第</th>{kind === "envelope" && <th className="p-2">數量</th>}</tr></thead><tbody>{pending.slice(0, 5).map((row, index) => <tr key={index} className="border-b border-[var(--border)]"><td className="p-2">{row.name || "—"}</td>{kind !== "envelope" && <td className="p-2">{row.deptClass}</td>}{kind === "general" && <td className="p-2">{row.studentId}</td>}<td className="p-2">{row.award}</td>{kind === "envelope" && <td className="p-2">{row.quantity}</td>}</tr>)}</tbody></table></div>
      <div className="flex flex-wrap gap-2"><Button type="button" size="sm" onClick={() => apply(false)}>取代名單</Button><Button type="button" size="sm" variant="secondary" onClick={() => apply(true)}>加入現有名單</Button><Button type="button" size="sm" variant="ghost" onClick={() => { setPending(null); setError(""); }}>取消匯入</Button></div>
    </div>}
  </div>;
}
