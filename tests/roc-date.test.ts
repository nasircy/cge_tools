import { describe, expect, it } from "vitest";
import { formatRocDate, formatSerialDate, toRocDateParts, toRocYear } from "../src/lib/roc-date";
import { formatSerial, nextSequenceValue } from "../src/lib/serial-format";

describe("民國日期與流水號格式", () => {
  it("西元 2026 年換算為民國 115 年", () => {
    expect(toRocYear(2026)).toBe(115);
  });

  it("日期元件包含民国年、月、日", () => {
    expect(toRocDateParts(new Date(2026, 10, 19))).toEqual({ rocYear: 115, month: 11, day: 19 });
  });

  it("依模板範例產生 11511190001", () => {
    expect(formatSerial(new Date(2026, 10, 19), 1)).toBe("11511190001");
  });

  it("月日與流水號補零", () => {
    expect(formatSerial(new Date(2026, 0, 5), 23)).toBe("11501050023");
  });

  it("RTDB 交易的日期鍵為西元 yyyymmdd", () => {
    expect(formatSerialDate(new Date(2026, 10, 19))).toBe("20261119");
  });

  it("產生中文日期字串", () => {
    expect(formatRocDate(new Date(2026, 10, 19))).toBe("中 華 民 國 115 年 11 月 19 日");
  });
});

describe("流水號交易遞增", () => {
  it.each([
    [undefined, 1],
    [0, 1],
    [7, 8],
    ["損壞資料", 1],
    [-3, 1],
  ])("目前值 %s 遞增為 %s", (current, expected) => {
    expect(nextSequenceValue(current)).toBe(expected);
  });
});
