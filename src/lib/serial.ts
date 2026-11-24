import { formatSerial } from "./serial-format";

export function createSerials(dateValue: string, start: number, count: number): readonly string[] {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue) || !Number.isFinite(date.getTime()) ||
      date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day || (year ?? 0) < 1912) {
    throw new Error("頒發日期無效");
  }
  if (!Number.isInteger(start) || start < 1 || !Number.isInteger(count) || count < 1 || count > 100 || start + count - 1 > 9999) {
    throw new Error("流水號起號須為 1–9999，且本批最後一號不能超過 9999");
  }
  return Array.from({ length: count }, (_, index) => formatSerial(date, start + index));
}
