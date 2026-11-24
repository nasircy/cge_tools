import PizZip from "pizzip";
import { certificateLayout } from "./layouts/certificate";
import { envelopeLayout } from "./layouts/envelope";
import { formatRocDate } from "./roc-date";
import type { CertificatePayload, EnvelopePayload } from "./schemas";

export type TemplateBytes = Uint8Array | ArrayBuffer;

export interface CertificateRenderOptions {
  readonly serials: readonly string[];
  readonly signerImage?: string;
}

interface ParagraphSpan {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

interface BodyParts {
  readonly prefix: string;
  readonly paragraphs: readonly string[];
  readonly suffix: string;
  readonly tail: string;
}

interface ImageData {
  readonly bytes: Uint8Array;
  readonly extension: string;
  readonly contentType: string;
}

const TEXT_TAG = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;

function decodeXml(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function encodeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function replaceTextInXml(xml: string, token: string, replacement: string): string {
  if (token.length === 0 || token === replacement) return xml;

  const matches = Array.from(xml.matchAll(TEXT_TAG));
  if (matches.length === 0) return xml;

  const segments = matches.map((match) => {
    const raw = match[1] ?? "";
    const textStart = match.index + match[0].indexOf(">") + 1;
    const textEnd = match.index + match[0].length - "</w:t>".length;
    return { start: textStart, end: textEnd, original: decodeXml(raw), value: decodeXml(raw) };
  });
  const originalText = segments.map((segment) => segment.original).join("");
  const positions: number[] = [];
  let cursor = 0;
  while (cursor <= originalText.length - token.length) {
    const found = originalText.indexOf(token, cursor);
    if (found < 0) break;
    positions.push(found);
    cursor = found + token.length;
  }
  if (positions.length === 0) return xml;

  for (const position of positions.reverse()) {
    const end = position + token.length;
    let first = -1;
    let last = -1;
    let firstLocalStart = 0;
    let lastLocalEnd = 0;
    let offset = 0;

    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index]!;
      const segmentEnd = offset + segment.original.length;
      if (first < 0 && position >= offset && position < segmentEnd) {
        first = index;
        firstLocalStart = position - offset;
      }
      if (first >= 0 && end <= segmentEnd) {
        last = index;
        lastLocalEnd = end - offset;
        break;
      }
      offset = segmentEnd;
    }
    if (first < 0 || last < first) continue;

    const firstSegment = segments[first]!;
    const lastSegment = segments[last]!;
    const prefix = firstSegment.original.slice(0, firstLocalStart);
    const suffix = lastSegment.original.slice(lastLocalEnd);

    for (let index = first + 1; index < last; index += 1) {
      segments[index]!.value = "";
    }
    if (first === last) {
      firstSegment.value = `${prefix}${replacement}${suffix}`;
    } else {
      firstSegment.value = `${prefix}${replacement}`;
      lastSegment.value = suffix;
    }
  }

  let output = "";
  let previousEnd = 0;
  matches.forEach((match, index) => {
    const segment = segments[index]!;
    const openTagEnd = match[0].indexOf(">") + 1;
    output += xml.slice(previousEnd, match.index);
    output += `${match[0].slice(0, openTagEnd)}${encodeXml(segment.value)}</w:t>`;
    previousEnd = match.index + match[0].length;
  });
  output += xml.slice(previousEnd);
  return output;
}

function replaceFields(xml: string, values: readonly (readonly [string, string])[]): string {
  const nonce = crypto.randomUUID();
  const markers = values.map((_, index) => `CGEFIELD${nonce.replaceAll("-", "")}SLOT${index}END`);
  let result = xml;
  values.forEach(([token], index) => { result = replaceTextInXml(result, token, markers[index]!); });
  values.forEach(([, value], index) => { result = replaceTextInXml(result, markers[index]!, value); });
  return result;
}

function extractTopLevelParagraphs(body: string): readonly ParagraphSpan[] {
  const tag = /<w:p\b[^>]*>|<\/w:p>/g;
  const spans: ParagraphSpan[] = [];
  let depth = 0;
  let start = -1;
  let match: RegExpExecArray | null = tag.exec(body);

  while (match !== null) {
    if (match[0].startsWith("</")) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        spans.push({ start, end: tag.lastIndex, text: body.slice(start, tag.lastIndex) });
        start = -1;
      }
    } else if (match[0].endsWith("/>")) {
      if (depth === 0) {
        spans.push({ start: match.index, end: tag.lastIndex, text: match[0] });
      }
    } else {
      if (depth === 0) start = match.index;
      depth += 1;
    }
    match = tag.exec(body);
  }
  return spans;
}

function splitBody(xml: string): BodyParts {
  const open = "<w:body>";
  const close = "</w:body>";
  const bodyStart = xml.indexOf(open);
  const bodyEnd = xml.indexOf(close);
  if (bodyStart < 0 || bodyEnd < 0) throw new Error("Word 模板缺少 w:body");

  const body = xml.slice(bodyStart + open.length, bodyEnd);
  const spans = extractTopLevelParagraphs(body);
  const last = spans.at(-1);
  if (!last) throw new Error("Word 模板沒有段落");

  return {
    prefix: xml.slice(0, bodyStart + open.length),
    paragraphs: spans.map((span) => span.text),
    suffix: body.slice(last.end),
    tail: xml.slice(bodyEnd),
  };
}

function readDocument(zip: PizZip): string {
  const document = zip.file("word/document.xml");
  if (!document) throw new Error("Word 模板缺少 word/document.xml");
  return document.asText();
}

function hexId(value: number): string {
  return value.toString(16).toUpperCase().padStart(8, "0");
}

function renumberDrawingIds(xml: string): string {
  let drawingId = 1;
  let anchorId = 1;

  const withDrawingIds = xml.replace(/<wp:docPr\b[^>]*\bid="\d+"[^>]*\/>/g, (match) =>
    match.replace(/id="\d+"/, `id="${drawingId++}"`),
  );
  const withAnchorIds = withDrawingIds.replace(/wp14:anchorId="[0-9A-Fa-f]+"/g, () => `wp14:anchorId="${hexId(anchorId++)}"`);
  return withAnchorIds.replace(/wp14:editId="[0-9A-Fa-f]+"/g, () => `wp14:editId="${hexId(anchorId++)}"`);
}


function drawingParagraph(relationshipId: string, drawingId: number): string {
  const width = 1097280;
  const height = 457200;
  return `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${width}" cy="${height}"/><wp:docPr id="${drawingId}" name="signer-image"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${drawingId}" name="signer-image.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="${relationshipId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${width}" cy="${height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}

function insertSignerImage(xml: string, signerTitle: string, relationshipId: string, drawingId: number): string {
  const encodedTitle = encodeXml(signerTitle);
  const textIndex = xml.indexOf(encodedTitle);
  if (textIndex < 0) return xml;

  const paragraphStart = Math.max(xml.lastIndexOf("<w:p ", textIndex), xml.lastIndexOf("<w:p>", textIndex));
  const paragraphEnd = xml.indexOf("</w:p>", textIndex);
  if (paragraphStart < 0 || paragraphEnd < 0) return xml;

  const insertAt = paragraphEnd + "</w:p>".length;
  return `${xml.slice(0, insertAt)}${drawingParagraph(relationshipId, drawingId)}${xml.slice(insertAt)}`;
}

function decodeImage(dataUrl: string): ImageData {
  const match = /^data:image\/(png|jpeg|jpg|gif);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl.trim());
  if (!match) throw new Error("簽章圖只支援 PNG/JPEG/GIF 的 data URL");

  const binary = atob(match[2] ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  const extension = match[1] === "jpg" ? "jpeg" : match[1] ?? "png";
  return { bytes, extension, contentType: `image/${extension}` };
}

function registerImage(zip: PizZip, image: ImageData): string {
  const relationshipsPath = "word/_rels/document.xml.rels";
  const relationshipsFile = zip.file(relationshipsPath);
  const contentTypesFile = zip.file("[Content_Types].xml");
  if (!relationshipsFile || !contentTypesFile) throw new Error("Word 模板缺少 relationship 或 content type 定義");

  const existingIds = Array.from(relationshipsFile.asText().matchAll(/Id="rId(\d+)"/g), (entry) => Number(entry[1]));
  const relationshipId = `rId${Math.max(0, ...existingIds) + 1}`;
  const mediaPath = `word/media/signer-image.${image.extension}`;

  zip.file(relationshipsPath, relationshipsFile.asText().replace(
    "</Relationships>",
    `<Relationship Id="${relationshipId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/signer-image.${image.extension}"/></Relationships>`,
  ));

  const contentTypes = contentTypesFile.asText();
  if (!contentTypes.includes(`Extension="${image.extension}"`)) {
    zip.file("[Content_Types].xml", contentTypes.replace(
      "</Types>",
      `<Default Extension="${image.extension}" ContentType="${image.contentType}"/></Types>`,
    ));
  }
  zip.file(mediaPath, image.bytes, { binary: true });
  return relationshipId;
}

function generateDocx(zip: PizZip): Uint8Array {
  return zip.generate({ type: "uint8array", compression: "DEFLATE" });
}

export function createLayoutPackage(kind: "certificate" | "envelope"): PizZip {
  const zip = new PizZip();
  const font = kind === "certificate" ? "標楷體" : "華康行書體";
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/></Types>`);
  zip.file("_rels/.rels", `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file("word/_rels/document.xml.rels", `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdFonts" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/></Relationships>`);
  zip.file("word/styles.xml", `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${font}" w:eastAsia="${font}" w:hAnsi="${font}" w:cs="${font}"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="zh-TW" w:eastAsia="zh-TW"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`);
  zip.file("word/fontTable.xml", `<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:font w:name="${font}"/></w:fonts>`);
  zip.file("word/document.xml", kind === "certificate" ? certificateLayout : envelopeLayout);
  return zip;
}

export function renderCertificateDocx(
  payload: CertificatePayload,
  options: CertificateRenderOptions,
): Uint8Array {
  if (options.serials.length !== payload.recipients.length) {
    throw new Error("序號數量與得獎者數量不符");
  }

  const zip = createLayoutPackage("certificate");
  const body = splitBody(readDocument(zip));
  const prototype = body.paragraphs.slice(0, 19);
  if (prototype.length !== 19) throw new Error("獎狀模板結構已變更");

  const image = payload.signerImage ? decodeImage(payload.signerImage) : undefined;
  const relationshipId = image ? registerImage(zip, image) : "";
  const [year, month, day] = payload.date.split("-").map(Number);
  const date = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  const rocDate = formatRocDate(date);

  const blocks = payload.recipients.map((recipient, index) => {
    const serial = options.serials[index];
    if (!serial) throw new Error("序號不可為空");

    let block = replaceFields(prototype.join(""), [
      ["00000000000", serial], ["示例人", recipient.name],
      ["範例科系班級", recipient.deptClass], ["00000000", recipient.studentId],
      ["2026 彩繪生命：北商大生命教育繪畫比賽", payload.eventName],
      ["第一名", recipient.award], ["通識中心主任", payload.signerTitle],
      ["參加通識教育中心所舉辦之", "參加本校所舉辦之"],
      ["中 華 民 國 115 年 11 月 19 日", rocDate],
    ]);
    if (image) block = insertSignerImage(block, payload.signerTitle, relationshipId, 1000 + index);
    return block;
  });

  const document = `${body.prefix}${blocks.join("")}${body.suffix}${body.tail}`;
  zip.file("word/document.xml", document);
  return generateDocx(zip);
}

export function renderEnvelopeDocx(payload: EnvelopePayload): Uint8Array {
  const zip = createLayoutPackage("envelope");
  const body = splitBody(readDocument(zip));
  const prototype = body.paragraphs.slice(0, 2);
  if (prototype.length !== 2) throw new Error("紅包袋模板結構已變更");

  const referenceEvent = "2026 彩繪生命  北商大生命教育繪畫比賽";
  const unusedEventPlaceholder = "2020北商文學季";
  const unusedAwardPlaceholder = "佳 作做";

  const blocks = payload.recipients.map((recipient) => {
    const block = replaceFields(prototype.join(""), [
      [unusedAwardPlaceholder, ""],
      [unusedEventPlaceholder, ""],
      ["優等", recipient.award],
      [referenceEvent, payload.eventName],
      ["示例人", recipient.name],
    ]);
    return block;
  });

  const document = renumberDrawingIds(`${body.prefix}${blocks.join("")}${body.suffix}${body.tail}`);
  zip.file("word/document.xml", document);
  return generateDocx(zip);
}
