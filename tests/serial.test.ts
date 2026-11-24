import { describe, it, expect } from "vitest";
import { createSerials } from "../src/lib/serial";
import { certificatePayloadSchema, envelopePayloadSchema } from "../src/lib/schemas";

describe("browser-only serial numbering", () => {
  it("uses the chosen issue date and start number without storage or a server", () => {
    expect(createSerials("2026-11-24", 42, 2)).toEqual(["11511240042", "11511240043"]);
    expect(createSerials("2024-02-29", 9999, 1)).toEqual(["11302299999"]);
  });
  it("rejects invalid dates and batch overflow", () => {
    for (const date of ["2026-02-30", "2026-13-01", "invalid", "1911-12-31"]) expect(() => createSerials(date, 1, 1)).toThrow();
    for (const [start, count] of [[0, 1], [1.2, 1], [9999, 2], [1, 0], [1, 201]]) expect(() => createSerials("2026-11-24", start!, count!)).toThrow();
  });
  it("accepts 200 recipients consistently in both tools and serial numbering", () => {
    const recipients = Array.from({ length: 200 }, () => ({ name: "測試甲", deptClass: "測試班", studentId: "A01", award: "佳作" }));
    const certificate = { eventName: "測試活動", date: "2026-11-24", signerTitle: "校長", recipients };
    expect(certificatePayloadSchema.safeParse(certificate).success).toBe(true);
    expect(envelopePayloadSchema.safeParse(certificate).success).toBe(true);
    expect(createSerials("2026-11-24", 1, 200).at(-1)).toBe("11511240200");
    const overflow = [...recipients, recipients[0]!];
    expect(certificatePayloadSchema.safeParse({ ...certificate, recipients: overflow }).success).toBe(false);
    expect(envelopePayloadSchema.safeParse({ ...certificate, recipients: overflow }).success).toBe(false);
  });
  it("validates recipient data before generating files", () => {
    expect(certificatePayloadSchema.safeParse({ eventName: "活動", date: "2026-02-30", signerTitle: "主任", recipients: [{ name: "測試甲", deptClass: "測試班", studentId: "00000001", award: "佳作" }] }).success).toBe(false);
    expect(envelopePayloadSchema.safeParse({ eventName: "活動", recipients: [] }).success).toBe(false);
  });
});
