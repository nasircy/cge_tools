import { formatSerialDate, toRocDateParts } from "./roc-date";

const pad = (value: number, width: number): string => String(value).padStart(width, "0");

export function formatSerial(date: Date, sequence: number): string {
  const { rocYear, month, day } = toRocDateParts(date);
  return `${pad(rocYear, 3)}${pad(month, 2)}${pad(day, 2)}${pad(sequence, 4)}`;
}

export function nextSequenceValue(current: unknown): number {
  const value =
    typeof current === "number" && Number.isInteger(current) && current >= 0 ? current : 0;
  return value + 1;
}

export function serialKey(date: Date): string {
  return formatSerialDate(date);
}
