import PizZip from "pizzip";
import { recipientSchema, envelopeRecipientSchema } from "./schemas";

export type ImportKind = "general" | "literature" | "envelope";
export interface ImportedRecipient { name: string; deptClass: string; studentId: string; award: string; quantity: number; }
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 200;
const aliases: Record<string, keyof ImportedRecipient> = {
  姓名: "name", 學生姓名: "name", 學生: "name", name: "name",
  等第: "award", 獎項: "award", 名次: "award", award: "award",
  科系班級: "deptClass", 系級: "deptClass", 班級: "deptClass", deptclass: "deptClass",
  學號: "studentId", 學生學號: "studentId", studentid: "studentId",
  數量: "quantity", 份數: "quantity", quantity: "quantity",
};
export function templateHeaders(kind: ImportKind): string[] {
  return kind === "envelope" ? ["姓名", "等第", "數量"] : kind === "literature" ? ["姓名", "科系班級", "等第"] : ["姓名", "科系班級", "學號", "等第"];
}

// RFC 4180 fields, with comma/semicolon/tab separators used by Excel exports.
export function parseCsv(text: string): string[][] {
  text = text.replace(/^\uFEFF/, "");
  const separatorLine = /^sep=([,;\t])\r?\n/i.exec(text);
  let delimiter = separatorLine?.[1];
  if (separatorLine) text = text.slice(separatorLine[0].length);
  if (!delimiter) {
    const firstLine = text.split(/\r?\n/).find(line => line.trim()) ?? "";
    delimiter = firstLine.includes("\t") ? "\t" : firstLine.includes(",") ? "," : ";";
  }
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false, closed = false;
  const addField = () => { row.push(field); field = ""; closed = false; if (row.length > 64) throw Error("欄位太多，請使用下載的名單範本"); };
  const addRow = () => { addField(); rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { quoted = false; closed = true; }
      } else field += char;
    } else if (char === delimiter) addField();
    else if (char === "\n" || char === "\r") { if (char === "\r" && text[i + 1] === "\n") i++; addRow(); }
    else if (char === '"' && !field && !closed) quoted = true;
    else if (closed) { if (char !== " ") throw Error("CSV 引號格式不正確，請重新匯出檔案"); }
    else if (char === '"') throw Error("CSV 引號格式不正確，請重新匯出檔案");
    else field += char;
  }
  if (quoted) throw Error("CSV 引號未關閉，請重新匯出檔案");
  if (field || row.length || closed) addRow();
  return rows;
}

export function decodeCsv(bytes: Uint8Array): string {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch {
    try { return new TextDecoder("big5", { fatal: true }).decode(bytes); }
    catch { throw Error("無法讀取 CSV 文字，請另存為 UTF-8 CSV 後重試"); }
  }
}

export function parseRecipientRows(data: readonly (readonly unknown[])[], kind: ImportKind): ImportedRecipient[] {
  const headerIndex = data.findIndex(row => row.some(value => value !== null && value !== undefined && String(value).trim()));
  if (headerIndex < 0) throw Error("檔案沒有名單，請先填寫範本");
  const headers = data[headerIndex]!.map(value => String(value ?? "").trim().replace(/^\uFEFF/, "").replace(/\s/g, "").toLowerCase());
  const columns = new Map<keyof ImportedRecipient, number>();
  headers.forEach((header, index) => {
    const key = aliases[header];
    if (kind !== "envelope" && key === "quantity") return;
    if (key) {
      if (columns.has(key)) throw Error(`「${header}」欄位重複，請只保留一欄`);
      columns.set(key, index);
    }
  });
  if (!columns.has("award") || (kind !== "envelope" && !columns.has("name"))) throw Error(kind === "envelope" ? "第一列需要「等第」（或「獎項」）欄位，請使用下載的範本" : "第一列需要「姓名」和「等第」（或「獎項」）欄位，請使用下載的範本");
  const recipients: ImportedRecipient[] = [];
  for (let index = headerIndex + 1; index < data.length; index++) {
    const row = data[index]!;
    if (!row.some(value => value !== null && value !== undefined && String(value).trim())) continue;
    if (recipients.length >= MAX_ROWS) throw Error("每批最多 200 頁，請將名單分成多個檔案");
    const raw: Record<keyof ImportedRecipient, string> = { name: "", deptClass: "", studentId: "", award: "", quantity: "" };
    for (const [key, column] of columns) {
      const value = row[column];
      if (value === null || value === undefined) continue;
      if (typeof value !== "string" && typeof value !== "number") throw Error(`第 ${index + 1} 列的資料不是文字，請檢查儲存格格式`);
      if (typeof value === "number" && !Number.isSafeInteger(value)) throw Error(`第 ${index + 1} 列的數字無法完整讀取，請改為文字`);
      raw[key] = String(value).trim();
    }
    if (raw.quantity && !/^\d+$/.test(raw.quantity)) throw Error(`第 ${index + 1} 列：數量須為正整數`);
    const recipient: ImportedRecipient = { ...raw, quantity: raw.quantity ? Number(raw.quantity) : 1 };
    // Missing student IDs may be completed in the form before generating a general certificate.
    const check = kind === "envelope" ? envelopeRecipientSchema.safeParse(recipient) : recipientSchema.safeParse({ ...recipient, studentId: recipient.studentId || "-" });
    if (!check.success) throw Error(`第 ${index + 1} 列：${check.error.issues[0]?.message ?? "資料格式不正確"}`);
    if (kind === "envelope") { recipient.deptClass = ""; recipient.studentId = ""; }
    recipients.push(recipient);
    if (kind === "envelope" && recipients.reduce((sum, item) => sum + item.quantity, 0) > 200) throw Error("紅包袋合計最多 200 份，請分批匯入");
  }
  if (!recipients.length) throw Error("檔案只有欄位名稱，請從第二列開始填寫名單");
  return recipients;
}

export async function readRecipientFile(file: File, kind: ImportKind): Promise<ImportedRecipient[]> {
  if (file.size > MAX_IMPORT_BYTES) throw Error("檔案請小於 2 MB，並保留本次要製作的名單");
  if (/\.csv$/i.test(file.name)) return parseRecipientRows(parseCsv(decodeCsv(new Uint8Array(await file.arrayBuffer()))), kind);
  if (!/\.xlsx$/i.test(file.name)) throw Error("請選擇 Excel（.xlsx）或 CSV 檔案；舊版 .xls 請先另存為 .xlsx");
  let data: readonly (readonly unknown[])[];
  try {
    const { readSheet } = await import("read-excel-file/browser");
    data = await readSheet(file, { parseNumber: value => value });
  } catch {
    throw Error("無法讀取 Excel，請確認檔案未加密，並將名單放在第一張工作表");
  }
  return parseRecipientRows(data, kind);
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
// Generate a clean, empty workbook in memory; no original workbook or recipient list is bundled.
export function createImportTemplate(kind: ImportKind, format: "xlsx" | "csv"): Uint8Array {
  const headers = templateHeaders(kind);
  if (format === "csv") return new TextEncoder().encode(`\uFEFF${headers.join(",")}\r\n`);
  const zip = new PizZip();
  zip.file("[Content_Types].xml", `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`);
  zip.file("_rels/.rels", `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.file("xl/workbook.xml", `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="得獎者名單" sheetId="1" r:id="rId1"/></sheets></workbook>`);
  zip.file("xl/_rels/workbook.xml.rels", `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  zip.file("xl/styles.xml", `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="12"/><name val="Microsoft JhengHei"/></font><font><b/><sz val="12"/><color rgb="FFFFFFFF"/><name val="Microsoft JhengHei"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF7A205B"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="49" fontId="1" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFill="1" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
  const cells = headers.map((header, index) => `<c r="${String.fromCharCode(65 + index)}1" s="2" t="inlineStr"><is><t>${escapeXml(header)}</t></is></c>`).join("");
  const endColumn = String.fromCharCode(64 + headers.length);
  zip.file("xl/worksheets/sheet1.xml", `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${endColumn}201"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="22"/><cols><col min="1" max="${headers.length}" width="22" customWidth="1" style="1"/></cols><sheetData><row r="1" ht="28" customHeight="1">${cells}</row></sheetData><autoFilter ref="A1:${endColumn}201"/></worksheet>`);
  return zip.generate({ type: "uint8array", compression: "DEFLATE" });
}
