import { z } from "zod";

const MAX_BATCH = 200;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "請選擇獎狀製發日期").refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value &&
    date.getUTCFullYear() >= 1912 && date.getUTCFullYear() <= 9999;
}, "請選擇民國元年以後的有效日期");

export const recipientSchema = z.object({
  name: z.string().trim().min(1, "姓名為必填").max(40, "姓名最多 40 字"),
  deptClass: z.string().trim().max(50, "科系班級最多 50 字"),
  studentId: z.string().trim().min(1, "學號為必填"),
  award: z.string().trim().min(1, "獎項為必填").max(40, "獎項最多 40 字"),
});
export const certificatePayloadSchema = z.object({
  templateId: z.enum(["general", "literature"]).optional(),
  competitionName: z.string().trim().max(60, "競賽名稱最多 60 字").optional(),
  eventName: z.string().trim().min(1, "科目／活動名稱為必填").max(100, "科目／活動名稱最多 100 字"),
  date: isoDate,
  signerTitle: z.string().trim().min(1, "署名職稱為必填").max(60, "署名職稱最多 60 字"),
  signerImage: z.string().optional(),
  serials: z.array(z.string().min(1)).optional(),
  recipients: z.array(recipientSchema.extend({ studentId: z.string().trim() })).min(1, "至少需一位得獎者").max(MAX_BATCH, "每批最多 200 頁"),
}).superRefine((payload, context) => {
  if (payload.templateId === "literature") {
    if (!payload.competitionName) context.addIssue({ code: "custom", path: ["competitionName"], message: "請填寫文學季的競賽名稱" });
  } else {
    payload.recipients.forEach((recipient, index) => {
      if (!recipient.studentId) context.addIssue({ code: "custom", path: ["recipients", index, "studentId"], message: "學號為必填" });
    });
  }
});
export const envelopeRecipientSchema = z.object({
  name: z.string().trim().max(40, "姓名最多 40 字"),
  award: z.string().trim().min(1, "等第為必填").max(40, "等第最多 40 字"),
  quantity: z.number().int("數量須為整數").min(1, "數量至少 1 份").max(MAX_BATCH, "每批最多 200 頁").optional(),
});
export const envelopePayloadSchema = z.object({
  competitionName: z.string().trim().max(60, "比賽子項目最多 60 字").optional(),
  eventName: z.string().trim().min(1, "科目／活動名稱為必填").max(100, "科目／活動名稱最多 100 字"),
  recipients: z.array(envelopeRecipientSchema).min(1, "至少需一位得獎者").max(MAX_BATCH, "每批最多 200 頁"),
}).refine(payload => payload.recipients.reduce((sum, row) => sum + (row.quantity ?? 1), 0) <= MAX_BATCH, "紅包袋合計最多 200 份，請分批製作");
export type CertificatePayload = z.infer<typeof certificatePayloadSchema>;
export type EnvelopePayload = z.infer<typeof envelopePayloadSchema>;
export type Recipient = z.infer<typeof recipientSchema>;
