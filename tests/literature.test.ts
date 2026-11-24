import PizZip from "pizzip";
import { describe, expect, it } from "vitest";
import { renderCertificateDocx, renderEnvelopeDocx } from "../src/lib/docx";
import { certificatePayloadSchema } from "../src/lib/schemas";

const payload = {
  templateId: "literature" as const, eventName: "2026文學季", competitionName: "散文創作獎",
  date: "2026-06-04", signerTitle: "校長",
  recipients: [
    { name: "測試甲", deptClass: "測試班", studentId: "", award: "第一名" },
    { name: "測試乙", deptClass: "測試班", studentId: "", award: "佳作" },
  ],
};

describe("literature certificate", () => {
  it("prints separate event/subitem, consecutive serials, padded date and no invented student-ID field", () => {
    const zip = new PizZip(renderCertificateDocx(payload, { serials: ["11506040001", "11506040002"] }));
    const xml = zip.file("word/document.xml")!.asText();
    const text = [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m => m[1]).join("");
    expect(text.match(/文學獎獎狀/g)).toHaveLength(2);
    expect(text.match(/【2026文學季】「散文創作獎」/g)).toHaveLength(2);
    for (const value of ["11506040001", "11506040002", "本校測試班測試甲同學", "本校測試班測試乙同學", "榮獲佳作", "中 華 民 國 115 年 06 月 04 日"]) expect(text).toContain(value);
    expect(text).not.toContain("學號");
    expect(text).not.toMatch(/\{\{|示例人|00000000/);
    expect(xml.match(/<w:sectPr\b/g)).toHaveLength(3);
    expect(xml).toContain('w:eastAsia="標楷體"');
    expect(xml).toContain('<w:sz w:val="72"/>'); // 36pt headings
    expect(xml).toContain('<w:sz w:val="50"/>'); // 25pt body
    expect(xml).toContain('<w:color w:val="FF0000"/>');
    expect(xml).toContain('<w:spacing w:line="480" w:lineRule="auto"/>');
    expect(xml).not.toMatch(/<w:(?:u|pBdr|pgBorders)\b/);
    expect(zip.file("word/fontTable.xml")!.asText()).toContain('w:val="DFKai-SB"');
    expect(Object.keys(zip.files).some(n => /docProps|customXml|media\//.test(n))).toBe(false);
  });
  it("requires a subitem for literature, and a student ID only for the general template", () => {
    expect(certificatePayloadSchema.safeParse(payload).success).toBe(true);
    expect(certificatePayloadSchema.safeParse({ ...payload, competitionName: "" }).success).toBe(false);
    expect(certificatePayloadSchema.safeParse({ ...payload, templateId: "general" }).success).toBe(false);
    expect(certificatePayloadSchema.safeParse({ ...payload, templateId: "unknown" }).success).toBe(false);
  });
  it("does not recursively replace user input that resembles a layout token", () => {
    const bytes = renderCertificateDocx({ ...payload, eventName: "{{NAME}}活動", recipients: payload.recipients.slice(0, 1) }, { serials: ["11506040001"] });
    expect(new PizZip(bytes).file("word/document.xml")!.asText()).toContain("{{NAME}}活動");
  });
});

it("prints envelope subitems in their own reference text column, with the requested recipient name", () => {
  const zip = new PizZip(renderEnvelopeDocx({ eventName: "2026文學季", competitionName: "新詩創作獎", recipients: [{ name: "測試甲", award: "佳作" }] }));
  const xml = zip.file("word/document.xml")!.asText();
  for (const value of ["2026文學季", "新詩創作獎", "測試甲", "佳作", 'w:eastAsia="標楷體"', '<w:sz w:val="52"/>', '<w:sz w:val="96"/>', '<w:textDirection w:val="tbRl"/>']) expect(xml).toContain(value);
  expect(xml).not.toMatch(/\{\{|<w:(?:u|pBdr|pgBorders)\b/);
});
