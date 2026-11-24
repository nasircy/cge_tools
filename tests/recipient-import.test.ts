import { describe, expect, it } from "vitest";
import PizZip from "pizzip";
import { readSheet } from "read-excel-file/node";
import { createImportTemplate, decodeCsv, parseCsv, parseRecipientRows } from "../src/lib/recipient-import";
import { envelopePayloadSchema } from "../src/lib/schemas";
import { renderEnvelopeDocx } from "../src/lib/docx";
import { generateEnvelopeFiles } from "../src/lib/generate";

describe("recipient CSV imports", () => {
  it("handles BOM, CRLF, quotes, escaped quotes, commas and multiline fields", () => {
    const rows = parseCsv('\uFEFF姓名,等第,學號\r\n"Chen, Alex",第一名,00123\r\n"Anne ""A""\nLee",佳作,A001\r\n');
    expect(rows[1]).toEqual(["Chen, Alex", "第一名", "00123"]);
    expect(rows[2]).toEqual(['Anne "A"\nLee', "佳作", "A001"]);
    const result = parseRecipientRows(rows, "general");
    expect(result[0]?.studentId).toBe("00123");
  });
  it.each(['姓名;等第\n測試甲;佳作', '姓名\t等第\n測試甲\t佳作', 'sep=,\r\n姓名,等第\r\n測試甲,佳作'])("supports Excel delimiters", csv => {
    expect(parseRecipientRows(parseCsv(csv), "literature")[0]?.award).toBe("佳作");
  });
  it("reads Windows Big5 and UTF-8 text", () => {
    expect(decodeCsv(new Uint8Array([0xA4, 0xA4, 0xA4, 0xE5]))).toBe("中文");
    expect(decodeCsv(new TextEncoder().encode("姓名,等第"))).toBe("姓名,等第");
  });
  it.each(['姓名,等第\n"未關閉,佳作', '姓名,等第\n"測試"x,佳作'])("rejects malformed quoting atomically", csv => {
    expect(() => parseCsv(csv)).toThrow(/引號/);
  });
  it("accepts column aliases, optional department/ID and ignores blank rows", () => {
    const data = [["學生姓名", "獎項", "學生學號"], ["測試甲", "佳作", "0000123"], [null, null, null], ["Alex", "優等", "A-0001"]];
    expect(parseRecipientRows(data, "general").map(row => row.studentId)).toEqual(["0000123", "A-0001"]);
    expect(parseRecipientRows([["姓名", "等第"], ["測試甲", "佳作"]], "general")[0]?.studentId).toBe("");
  });
  it("reports source row and rejects missing/duplicate headers and invalid rows", () => {
    expect(() => parseRecipientRows([["姓名", "姓名", "等第"], ["甲", "乙", "優等"]], "general")).toThrow(/重複/);
    expect(() => parseRecipientRows([["姓名"], ["測試甲"]], "general")).toThrow(/第一列/);
    expect(() => parseRecipientRows([["姓名", "等第"], ["", "佳作"]], "general")).toThrow(/第 2 列.*姓名/);
    expect(() => parseRecipientRows([["姓名", "等第"]], "envelope")).toThrow(/第二列/);
  });
  it("accepts 200 rows and rejects the entire batch at 201", () => {
    const rows = [["姓名", "等第"], ...Array.from({ length: 200 }, () => ["測試甲", "佳作"])];
    expect(parseRecipientRows(rows, "general")).toHaveLength(200);
    expect(() => parseRecipientRows([...rows, ["測試乙", "優等"]], "general")).toThrow(/200/);
  });
});

describe("generated Excel templates", () => {
  it.each(["general", "literature", "envelope"] as const)("round-trips %s through an independent XLSX reader", async kind => {
    const bytes = createImportTemplate(kind, "xlsx");
    const rows = await readSheet(bytes);
    expect(rows[0]).toContain("姓名");
    expect(rows[0]).toContain("等第");
    if (kind === "envelope") expect(rows[0]).toEqual(["姓名", "等第", "數量"]);
    const zip = new PizZip(bytes);
    expect(Object.keys(zip.files).some(n => /docProps|customXml|externalLink/.test(n))).toBe(false);
    expect(zip.file("xl/styles.xml")!.asText()).toContain('numFmtId="49"');
    expect(zip.file("xl/worksheets/sheet1.xml")!.asText()).not.toContain("測試甲");
  });
  it("preserves leading-zero and long IDs after XLSX editing and parsing", async () => {
    const zip = new PizZip(createImportTemplate("general", "xlsx"));
    const row = '<row r="2"><c r="A2" t="inlineStr"><is><t>測試甲</t></is></c><c r="C2" t="inlineStr"><is><t>000123456789012345</t></is></c><c r="D2" t="inlineStr"><is><t>佳作</t></is></c></row>';
    zip.file("xl/worksheets/sheet1.xml", zip.file("xl/worksheets/sheet1.xml")!.asText().replace("</sheetData>", `${row}</sheetData>`));
    const rows = await readSheet(zip.generate({ type: "uint8array" }), { parseNumber: value => value });
    expect(parseRecipientRows(rows, "general")[0]?.studentId).toBe("000123456789012345");
  });
  it("writes Windows-friendly UTF-8 BOM CSV without sample recipients", () => {
    const bytes = createImportTemplate("envelope", "csv");
    expect([...bytes.slice(0, 3)]).toEqual([239, 187, 191]);
    expect(parseCsv(decodeCsv(bytes))).toEqual([["姓名", "等第", "數量"]]);
  });
});

describe("anonymous envelopes and copy counts", () => {
  it("imports envelopes with no names or name column and defaults missing quantity to one", () => {
    const rows = parseRecipientRows([["等第", "數量"], ["第一名", "3"], ["佳作", ""]], "envelope");
    expect(rows.map(row => [row.name, row.quantity])).toEqual([["", 3], ["", 1]]);
  });
  it.each(["0", "-1", "1.5", "NaN", "201"])("rejects invalid quantity %s", value => {
    expect(() => parseRecipientRows([["等第", "數量"], ["佳作", value]], "envelope")).toThrow();
  });
  it("counts total copies rather than rows for the 200-page limit", () => {
    expect(() => parseRecipientRows([["等第", "數量"], ["佳作", "150"], ["優等", "51"]], "envelope")).toThrow(/200/);
    expect(envelopePayloadSchema.safeParse({ eventName: "測試活動", recipients: [{ name: "", award: "佳作", quantity: 200 }] }).success).toBe(true);
    expect(envelopePayloadSchema.safeParse({ eventName: "測試活動", recipients: [{ name: "", award: "佳作", quantity: 150 }, { name: "", award: "優等", quantity: 51 }] }).success).toBe(false);
  });
  it("generates the requested number of complete layouts with optional names and a correct filename", async () => {
    const payload = { eventName: "測試活動", recipients: [{ name: "", award: "匿名等第", quantity: 3 }, { name: "測試甲", award: "優等", quantity: 2 }] };
    const files = await generateEnvelopeFiles(payload);
    const xml = new PizZip(files.docx).file("word/document.xml")!.asText();
    expect(files.filename).toBe("紅包袋_5份");
    expect(xml.match(/匿名等第/g)).toHaveLength(3);
    expect(xml.match(/測試甲/g)).toHaveLength(2);
    expect(xml.match(/<w:sectPr\b/g)).toHaveLength(6);
    expect(xml).not.toMatch(/\{\{(?:NAME|AWARD)\}\}/);
    expect(() => renderEnvelopeDocx({ ...payload, recipients: [{ name: "", award: "佳作", quantity: 201 }] })).toThrow(/200/);
  });
});
