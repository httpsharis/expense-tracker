import { describe, expect, it } from "bun:test";
import {
  endOfLocalMonth,
  formatLocalDateKey,
  parseLocalDate,
  startOfLocalDay,
  startOfLocalMonth,
  startOfNextLocalMonth,
} from "../dates";

describe("local date helpers", () => {
  it("parses YYYY-MM-DD strings as local midnight instead of UTC midnight", () => {
    const parsed = parseLocalDate("2026-10-01");
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(9);
    expect(parsed.getDate()).toBe(1);
    expect(parsed.getHours()).toBe(0);
    expect(parsed.getMinutes()).toBe(0);
    expect(parsed.getSeconds()).toBe(0);
  });

  it("formats local dates near midnight without shifting to previous UTC day", () => {
    // 00:30 local time on Oct 1 (in UTC+5 this is Sept 30 19:30Z)
    const localAfterMidnight = new Date(2026, 9, 1, 0, 30, 0, 0);
    expect(formatLocalDateKey(localAfterMidnight)).toBe("2026-10-01");
  });

  it("computes local month boundaries accurately", () => {
    const ref = new Date(2026, 1, 15, 14, 20, 0); // Feb 15, 2026
    const start = startOfLocalMonth(ref);
    const end = endOfLocalMonth(ref);
    const next = startOfNextLocalMonth(ref);

    expect(formatLocalDateKey(start)).toBe("2026-02-01");
    expect(start.getHours()).toBe(0);

    expect(formatLocalDateKey(end)).toBe("2026-02-28");
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
    expect(end.getMilliseconds()).toBe(999);

    expect(formatLocalDateKey(next)).toBe("2026-03-01");
    expect(startOfLocalDay(ref).getHours()).toBe(0);
  });
});

