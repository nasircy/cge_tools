import PizZip from "pizzip";
import { renderCertificateDocx, renderEnvelopeDocx } from "./docx";
import { createBlob, downloadBlob } from "./download";
import type { CertificatePayload, EnvelopePayload } from "./schemas";

export interface GeneratedFiles { readonly docx: Uint8Array; readonly filename: string; }
export type GeneratedFileFormat = "docx" | "zip";
export async function generateCertificateFiles(payload: CertificatePayload, serials: readonly string[]): Promise<GeneratedFiles> {
  return { docx: renderCertificateDocx(payload, { serials }), filename: `獎狀_${payload.date}_${payload.recipients.length}份` };
}
export async function generateEnvelopeFiles(payload: EnvelopePayload): Promise<GeneratedFiles> {
  return { docx: renderEnvelopeDocx(payload), filename: `紅包袋_${payload.recipients.length}份` };
}
export async function downloadGeneratedFiles(files: GeneratedFiles, format: GeneratedFileFormat): Promise<void> {
  if (format === "docx") {
    downloadBlob(createBlob(files.docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"), `${files.filename}.docx`);
  } else {
    const zip = new PizZip(); zip.file(`${files.filename}.docx`, files.docx);
    downloadBlob(createBlob(zip.generate({ type: "uint8array", compression: "DEFLATE" }), "application/zip"), `${files.filename}.zip`);
  }
}
