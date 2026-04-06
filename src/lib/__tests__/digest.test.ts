import { describe, it, expect } from "vitest";
import { getOccurrencesInWeek, getWeekBoundaries, findGapValue } from "../digest";

describe("getOccurrencesInWeek", () => {
  const weekStart = new Date("2026-03-30");
  const weekEnd = new Date("2026-04-05");

  it("returns 7 for daily", () => {
    expect(getOccurrencesInWeek("daily", weekStart, weekEnd)).toBe(7);
  });

  it("returns 1 for weekly", () => {
    expect(getOccurrencesInWeek("weekly", weekStart, weekEnd)).toBe(1);
  });

  it("returns 1 for biweekly (simplified)", () => {
    expect(getOccurrencesInWeek("biweekly", weekStart, weekEnd)).toBe(1);
  });

  it("returns 1 for monthly", () => {
    expect(getOccurrencesInWeek("monthly", weekStart, weekEnd)).toBe(1);
  });

  it("returns 1 for every_3_months", () => {
    expect(getOccurrencesInWeek("every_3_months", weekStart, weekEnd)).toBe(1);
  });

  it("returns 1 for every_6_months", () => {
    expect(getOccurrencesInWeek("every_6_months", weekStart, weekEnd)).toBe(1);
  });

  it("returns 1 for yearly", () => {
    expect(getOccurrencesInWeek("yearly", weekStart, weekEnd)).toBe(1);
  });

  it("returns 1 for non-recurring (null)", () => {
    expect(getOccurrencesInWeek(null, weekStart, weekEnd)).toBe(1);
  });

  it("returns 0 on error (invalid input)", () => {
    expect(getOccurrencesInWeek("invalid_rule" as never, weekStart, weekEnd)).toBe(0);
  });
});

describe("getWeekBoundaries", () => {
  it("returns Monday-Sunday for a mid-week date", () => {
    const date = new Date("2026-04-01"); // Wednesday
    const { weekStart, weekEnd } = getWeekBoundaries(date, null);
    expect(weekStart.getDay()).toBe(1); // Monday
    expect(weekEnd.getDay()).toBe(0); // Sunday
  });

  it("returns same week when given a Monday", () => {
    const date = new Date("2026-03-30"); // Monday
    const { weekStart } = getWeekBoundaries(date, null);
    expect(weekStart.getDate()).toBe(30);
  });

  it("returns same week when given a Sunday", () => {
    const date = new Date("2026-04-05"); // Sunday
    const { weekStart, weekEnd } = getWeekBoundaries(date, null);
    expect(weekStart.getDate()).toBe(30); // Monday Mar 30
    expect(weekEnd.getDate()).toBe(5); // Sunday Apr 5
  });

  it("handles timezone string", () => {
    const date = new Date("2026-04-01");
    const { weekStart } = getWeekBoundaries(date, "America/New_York");
    expect(weekStart).toBeInstanceOf(Date);
  });

  it("handles null timezone (UTC fallback)", () => {
    const date = new Date("2026-04-01");
    const { weekStart } = getWeekBoundaries(date, null);
    expect(weekStart).toBeInstanceOf(Date);
  });
});

describe("findGapValue", () => {
  it("returns the value with lowest alignment among top 3", () => {
    const scores = [
      { valueId: "1", valueName: "Clean home", priority: 1, alignmentPct: 85 },
      { valueId: "2", valueName: "Health", priority: 2, alignmentPct: 30 },
      { valueId: "3", valueName: "Errands", priority: 3, alignmentPct: 70 },
      { valueId: "4", valueName: "Personal", priority: 4, alignmentPct: 50 },
    ];
    const gap = findGapValue(scores);
    expect(gap).not.toBeNull();
    expect(gap!.valueName).toBe("Health");
    expect(gap!.alignmentPct).toBe(30);
  });

  it("returns null when no scores", () => {
    expect(findGapValue([])).toBeNull();
  });

  it("returns null when all alignments are null", () => {
    const scores = [
      { valueId: "1", valueName: "A", priority: 1, alignmentPct: null },
      { valueId: "2", valueName: "B", priority: 2, alignmentPct: null },
    ];
    expect(findGapValue(scores)).toBeNull();
  });

  it("handles tie-breaking by priority", () => {
    const scores = [
      { valueId: "1", valueName: "A", priority: 1, alignmentPct: 50 },
      { valueId: "2", valueName: "B", priority: 2, alignmentPct: 50 },
      { valueId: "3", valueName: "C", priority: 3, alignmentPct: 50 },
    ];
    const gap = findGapValue(scores);
    expect(gap!.valueName).toBe("A"); // highest priority (lowest number) wins
  });

  it("only considers top 3 by priority", () => {
    const scores = [
      { valueId: "1", valueName: "A", priority: 1, alignmentPct: 80 },
      { valueId: "2", valueName: "B", priority: 2, alignmentPct: 70 },
      { valueId: "3", valueName: "C", priority: 3, alignmentPct: 60 },
      { valueId: "4", valueName: "D", priority: 4, alignmentPct: 10 }, // lowest but not in top 3
    ];
    const gap = findGapValue(scores);
    expect(gap!.valueName).toBe("C"); // lowest among top 3
  });

  it("skips null alignments in ranking", () => {
    const scores = [
      { valueId: "1", valueName: "A", priority: 1, alignmentPct: null },
      { valueId: "2", valueName: "B", priority: 2, alignmentPct: 40 },
      { valueId: "3", valueName: "C", priority: 3, alignmentPct: 80 },
    ];
    const gap = findGapValue(scores);
    expect(gap!.valueName).toBe("B");
  });
});
