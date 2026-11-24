export const certificateTemplates = [
  { id: "general", label: "通用通識獎狀模板" },
  { id: "literature", label: "文學季獎狀模板" },
] as const;

export type CertificateTemplateId = typeof certificateTemplates[number]["id"];
