import PizZip from "pizzip";
import { describe, expect, it } from "vitest";
import { certificatePayloadSchema, envelopePayloadSchema, recipientSchema } from "../src/lib/schemas";
import { createSerials } from "../src/lib/serial";
import { renderCertificateDocx, renderEnvelopeDocx } from "../src/lib/docx";

const recipient = { name: "測試甲", deptClass: "測試班", studentId: "00123", award: "優等" };
const documentXml = (bytes: Uint8Array) => new PizZip(bytes).file("word/document.xml")!.asText();

describe("free-text recipient fields", () => {
  it.each(["123", "00123", "1234567890", "A00123", "ABC-0123456789"])("preserves student ID %s without numeric conversion or a fixed length", studentId => {
    expect(recipientSchema.parse({ ...recipient, studentId }).studentId).toBe(studentId);
  });
  it.each(["測試甲", "Alex Chen", "Anne-Marie O’Neil"])("accepts the text name %s", name => {
    expect(recipientSchema.parse({ ...recipient, name }).name).toBe(name);
  });
  it("still requires a name and student ID", () => {
    expect(recipientSchema.safeParse({ ...recipient, studentId: " " }).success).toBe(false);
    expect(recipientSchema.safeParse({ ...recipient, name: " " }).success).toBe(false);
  });
});

describe("editable subjects and issue-date serials in downloaded Word documents", () => {
  it("uses the edited subject, English name and text ID with the selected issue date", () => {
    const payload = certificatePayloadSchema.parse({
      eventName: "英語表達 A&B", date: "2027-02-03", signerTitle: "校長",
      recipients: [{ ...recipient, name: "Alex Chen", studentId: "A00123" }],
    });
    const xml = documentXml(renderCertificateDocx(payload, { serials: createSerials(payload.date, 7, payload.recipients.length) }));
    expect(xml).toContain("英語表達 A&amp;B");
    expect(xml).toContain("Alex Chen");
    expect(xml).toContain("A00123");
    expect(xml).toContain("11602030007");
    expect(xml).toContain("中 華 民 國 116 年 2 月 3 日");
  });
  it("changes the serial date and printed date together when the issue date changes", () => {
    const payload = certificatePayloadSchema.parse({
      eventName: "國文寫作", date: "2026-12-05", signerTitle: "校長",
      recipients: [recipient],
    });
    const xml = documentXml(renderCertificateDocx(payload, { serials: createSerials(payload.date, 7, 1) }));
    expect(xml).toContain("11512050007");
    expect(xml).toContain("中 華 民 國 115 年 12 月 5 日");
    expect(xml).not.toContain("11602030007");
  });
  it("uses the shared red-envelope layout for a custom subject and English name", () => {
    const payload = envelopePayloadSchema.parse({ eventName: "創意寫作", recipients: [{ name: "Alex Chen", award: "佳作" }] });
    const xml = documentXml(renderEnvelopeDocx(payload));
    expect(xml).toContain("創意寫作");
    expect(xml).toContain("Alex Chen");
    expect(xml).not.toContain("2020北商文學季");
  });
});
