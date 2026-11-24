import PizZip from "pizzip";
import { describe, expect, it } from "vitest";
import { renderCertificateDocx, renderEnvelopeDocx } from "../src/lib/docx";
import type { CertificatePayload, EnvelopePayload } from "../src/lib/schemas";

const documentXml = (bytes: Uint8Array): string => {
  const zip = new PizZip(bytes);
  const document = zip.file("word/document.xml");
  if (!document) throw new Error("輸出缺少 word/document.xml");
  return document.asText();
};

describe("renderCertificateDocx", () => {
  const payload: CertificatePayload = {
    eventName: "2026 彩繪生命：北商大生命教育繪畫比賽",
    date: "2026-01-05",
    signerTitle: "通識中心主任",
    recipients: [
      { name: "王小明", deptClass: "五專資管三甲", studentId: "11351001", award: "第一名" },
      { name: "李美玲", deptClass: "四技企管二甲", studentId: "11351002", award: "第二名" },
    ],
  };

  it("置換跨 run 的序號與欄位，並為每位得獎者複製一段原型", () => {
    const output = renderCertificateDocx(payload, {
      serials: ["11511190008", "11511190009"],
    });
    const xml = documentXml(output);

    expect(xml).toContain("11511190008");
    expect(xml).toContain("11511190009");
    expect(xml).toContain("王小明");
    expect(xml).toContain("五專資管三甲");
    expect(xml).toContain("11351002");
    expect(xml).toContain("第二名");
    expect(xml).toContain("中 華 民 國 115 年 1 月 5 日");
    expect(xml).not.toContain("11511190001");
    expect(xml).not.toContain("範例原姓名");
    expect(xml).not.toContain("00000000");
    expect(xml.match(/北商大通字第/g)).toHaveLength(2);
    expect(xml.match(/<w:sectPr\b/g)).toHaveLength(3);
  });

  it("拒絕序號數量不符", () => {
    expect(() => renderCertificateDocx(payload, { serials: ["11511190008"] })).toThrow(
      "序號數量與得獎者數量不符",
    );
  });

  it("加入簽章圖時註冊 media、relationship 與 content type", () => {
    const output = renderCertificateDocx({
      ...payload,
      signerImage:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/nY8AAAAASUVORK5CYII=",
    }, { serials: ["11511190008", "11511190009"] });
    const zip = new PizZip(output);
    const relationships = zip.file("word/_rels/document.xml.rels")?.asText() ?? "";
    const contentTypes = zip.file("[Content_Types].xml")?.asText() ?? "";
    const xml = zip.file("word/document.xml")?.asText() ?? "";

    expect(zip.file("word/media/signer-image.png")).not.toBeNull();
    expect(relationships).toContain("Target=\"media/signer-image.png\"");
    expect(contentTypes).toContain("Extension=\"png\"");
    expect(xml).toContain("name=\"signer-image\"");
  });
});

describe("renderEnvelopeDocx", () => {
  const basePayload: Omit<EnvelopePayload, "recipients"> = {
    eventName: "2026 北商文學季",
  };

  it("共同版面套用活動名稱並重編所有 drawing id", () => {
    const output = renderEnvelopeDocx({
      ...basePayload,
      recipients: [
        { name: "王小明", award: "佳作" },
        { name: "陳怡君怡君", award: "甲等" },
      ],
    });
    const xml = documentXml(output);
    const ids = Array.from(xml.matchAll(/<wp:docPr\b[^>]*\bid="(\d+)"/g), (match) => match[1] ?? "");

    expect(xml).toContain("王小明");
    expect(xml).toContain("陳怡君怡君");
    expect(xml).toContain("甲等");
    expect(xml).toContain("2026 北商文學季");
    expect(xml).not.toContain("佳 作做");
    expect(xml).not.toContain("優等");
    expect(xml).not.toContain("2020北商文學季");
    expect(xml).not.toContain("2026 彩繪生命");
    expect(xml.match(/<wp:anchor\b/g)).toHaveLength(10);
    expect(ids).toHaveLength(10);
    expect(new Set(ids).size).toBe(10);
    expect(xml).toMatch(/<w:sz w:val="96"\/>/);
  });

  it("共同版面清空未使用的原稿示例並置換等第", () => {
    const output = renderEnvelopeDocx({
      ...basePayload,
      eventName: "2026 彩繪生命：北商大生命教育繪畫比賽",
      recipients: [{ name: "張志明", award: "特優" }],
    });
    const xml = documentXml(output);

    expect(xml).toContain("特優");
    expect(xml).toContain("張志明");
    expect(xml).toContain("2026 彩繪生命：北商大生命教育繪畫比賽");
    expect(xml).not.toContain("優等");
    expect(xml).not.toContain("佳 作做");
    expect(xml).not.toContain("2020北商文學季");
    expect(xml.match(/<wp:anchor\b/g)).toHaveLength(5);
  });
});
