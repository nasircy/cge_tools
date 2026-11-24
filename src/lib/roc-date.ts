export interface RocDateParts {
  readonly rocYear: number;
  readonly month: number;
  readonly day: number;
}

const pad = (value: number): string => String(value).padStart(2, "0");

export function toRocYear(adYear: number): number {
  return adYear - 1911;
}

export function toRocDateParts(date: Date): RocDateParts {
  return {
    rocYear: toRocYear(date.getFullYear()),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

export function formatRocDate(date: Date): string {
  const { rocYear, month, day } = toRocDateParts(date);
  return `中 華 民 國 ${rocYear} 年 ${month} 月 ${day} 日`;
}

export function formatSerialDate(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}
