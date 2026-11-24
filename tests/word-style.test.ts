import PizZip from "pizzip";
import { describe, expect, it } from "vitest";
import { renderCertificateDocx, renderEnvelopeDocx } from "../src/lib/docx";

describe("reference Word formatting and public-data isolation", () => {
  it("preserves BiauKai, original point sizes and A4 margins without added borders", () => {
    const bytes = renderCertificateDocx({ eventName: "測試活動", date: "2026-11-24", signerTitle: "校長", recipients: [{ name: "測試甲", deptClass: "測試班", studentId: "00000001", award: "優等" }] }, { serials: ["11511240001"] });
    const zip = new PizZip(bytes), xml = zip.file("word/document.xml")!.asText();
    expect(xml).toContain('w:eastAsia="標楷體"');
    expect(xml).toContain('<w:sz w:val="144"/>');
    expect(xml).toContain('w:top="1440" w:right="1800" w:bottom="1440" w:left="1800"');
    expect(xml).not.toMatch(/<w:(?:pBdr|pgBorders)\b/);
    expect(Object.keys(zip.files)).not.toContain("docProps/core.xml");
    expect(Object.keys(zip.files).some(n => n.startsWith("customXml/"))).toBe(false);
    expect(xml).toContain("測試甲");
    expect(xml).not.toContain("示例人");
  });
  it("keeps the envelope reference typeface and physical dimensions", () => {
    const bytes = renderEnvelopeDocx({ eventName: "測試活動", recipients: [{ name: "測試甲", award: "優等" }] });
    const xml = new PizZip(bytes).file("word/document.xml")!.asText();
    expect(xml).toContain('w:eastAsia="華康行書體"');
    expect(xml).toContain('w:w="5103" w:h="11340"');
    expect(xml).toContain("測試甲");
  });
});

it("does not replace placeholder-like text inside user input", () => {
  const bytes = renderCertificateDocx({ eventName: "第一名活動", date: "2026-11-24", signerTitle: "校長", recipients: [{ name: "00000000", deptClass: "第一名班", studentId: "12345678", award: "優等" }] }, { serials: ["11511240001"] });
  const xml = new PizZip(bytes).file("word/document.xml")!.asText();
  expect(xml).toContain("00000000");
  expect(xml).toContain("第一名活動");
  expect(xml).toContain("第一名班");
  expect(xml).toContain("優等");
});

it("uses the supplied signer title without fixed department text in the certificate", () => {
  const bytes = renderCertificateDocx({ eventName: "跨域學習成果", date: "2026-11-24", signerTitle: "校長", recipients: [{ name: "測試甲", deptClass: "測試班", studentId: "A01", award: "優等" }] }, { serials: ["11511240001"] });
  const xml = new PizZip(bytes).file("word/document.xml")!.asText();
  expect(xml).toContain("校長");
  expect(xml).toContain("參加本校所舉辦之");
  expect(xml).not.toContain("通識中心主任");
  expect(xml).not.toContain("通識教育中心");
  expect(xml).toContain('w:eastAsia="標楷體"');
  expect(xml).not.toMatch(/<w:(?:pBdr|pgBorders)\b/);
});
