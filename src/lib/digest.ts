import { prisma } from "./db";
import { RecurrenceRule, TaskCategory } from "@prisma/client";

// ---------------------------------------------------------------------------
// Pattern detection thresholds
// ---------------------------------------------------------------------------
export const WORKLOAD_IMBALANCE_THRESHOLD = 0.6;
export const CATEGORY_DOMINANCE_THRESHOLD = 0.7;
export const STREAK_WEEKS = 3;
export const NEGLECT_WEEKS = 2;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ValueScore = {
  valueId: string;
  valueName: string;
  category: TaskCategory;
  priority: number;
  tasksDue: number;
  tasksCompleted: number;
  alignmentPct: number | null;
};

export type MemberActivity = {
  memberId: string;
  memberName: string;
  taskCount: number;
  topCategory: TaskCategory | null;
};

export type DigestData = {
  boardId: string;
  weekStart: Date;
  weekEnd: Date;
  totalTasksDue: number;
  totalTasksCompleted: number;
  prevWeekCompleted: number;
  valueScores: ValueScore[];
  memberActivity: MemberActivity[];
};

export type PatternSignal = {
  type: "workload" | "dominance" | "streak" | "neglect" | "time_of_day";
  data: Record<string, unknown>;
};

export type GapValue = {
  valueId: string;
  valueName: string;
  priority: number;
  alignmentPct: number;
};

// ---------------------------------------------------------------------------
// 1. getOccurrencesInWeek
// ---------------------------------------------------------------------------

export function getOccurrencesInWeek(
  rule: RecurrenceRule | null,
  _weekStart: Date,
  _weekEnd: Date,
): number {
  try {
    if (rule === null) return 1;

    switch (rule) {
      case "daily":
        return 7;
      case "weekly":
        return 1;
      case "biweekly":
        // Simplification for v1: a biweekly task lands in roughly half the weeks.
        // Return 1 since we can't know the origin date cheaply.
        return 1;
      case "monthly":
        // Once per month; most weeks will contain one monthly occurrence.
        return 1;
      case "every_3_months":
      case "every_6_months":
      case "yearly":
        // Rare recurrences — assume at most 1 in any given week.
        return 1;
      default:
        return 0;
    }
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// 2. getWeekBoundaries
// ---------------------------------------------------------------------------

export function getWeekBoundaries(
  date: Date,
  timezone: string | null,
): { weekStart: Date; weekEnd: Date } {
  // Resolve "today" in the board's timezone (or UTC).
  const local = toLocalDate(date, timezone);

  // JS getDay(): 0 = Sunday … 6 = Saturday. We want Monday = 0.
  const dayOfWeek = local.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const weekStart = new Date(local);
  weekStart.setDate(weekStart.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

/** Interpret a Date in a given timezone, returning a plain Date with local y/m/d. */
function toLocalDate(date: Date, timezone: string | null): Date {
  if (!timezone) {
    return new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
    );
  }

  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const year = parseInt(parts.find((p) => p.type === "year")!.value);
    const month = parseInt(parts.find((p) => p.type === "month")!.value) - 1;
    const day = parseInt(parts.find((p) => p.type === "day")!.value);
    return new Date(year, month, day);
  } catch {
    return new Date(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    );
  }
}

// ---------------------------------------------------------------------------
// 3. computeDigestData
// ---------------------------------------------------------------------------

export async function computeDigestData(
  boardId: string,
  weekStart: Date,
  weekEnd: Date,
): Promise<DigestData> {
  // Parallel queries
  const [completions, tasks, boardValues, members, prevWeekCompletions] =
    await Promise.all([
      // Completions in this week
      prisma.taskHistory.findMany({
        where: {
          board_id: boardId,
          completed_at: { gte: weekStart, lte: weekEnd },
        },
        include: {
          task: { select: { category: true } },
          completer: { select: { id: true, name: true } },
        },
      }),

      // All tasks for the board (active or completed within the week)
      prisma.task.findMany({
        where: { board_id: boardId },
        select: {
          id: true,
          category: true,
          recurrence_rule: true,
          status: true,
          next_due_date: true,
          created_at: true,
        },
      }),

      // Board values (category -> value mapping)
      prisma.boardValue.findMany({
        where: { board_id: boardId },
        orderBy: { priority: "asc" },
      }),

      // Members
      prisma.member.findMany({
        where: { board_id: boardId, active: true },
        select: { id: true, name: true },
      }),

      // Previous week completions count
      (() => {
        const prevStart = new Date(weekStart);
        prevStart.setDate(prevStart.getDate() - 7);
        const prevEnd = new Date(weekStart);
        prevEnd.setTime(prevEnd.getTime() - 1);
        return prisma.taskHistory.count({
          where: {
            board_id: boardId,
            completed_at: { gte: prevStart, lte: prevEnd },
          },
        });
      })(),
    ]);

  // Build category -> value mapping
  const categoryToValue = new Map(
    boardValues.map((v) => [v.category, v]),
  );

  // Count tasks due per category this week
  const dueByCat = new Map<TaskCategory, number>();
  for (const task of tasks) {
    // A task is "due this week" if it existed before weekEnd and could have
    // an occurrence in this week. For non-recurring completed tasks created
    // before the week, they count as 1 due.
    if (task.created_at > weekEnd) continue;

    const occurrences = getOccurrencesInWeek(
      task.recurrence_rule,
      weekStart,
      weekEnd,
    );
    dueByCat.set(
      task.category,
      (dueByCat.get(task.category) ?? 0) + occurrences,
    );
  }

  // Count completions per category
  const completedByCat = new Map<TaskCategory, number>();
  for (const c of completions) {
    const cat = c.task.category;
    completedByCat.set(cat, (completedByCat.get(cat) ?? 0) + 1);
  }

  // Build value scores
  const valueScores: ValueScore[] = boardValues.map((v) => {
    const due = dueByCat.get(v.category) ?? 0;
    const completed = completedByCat.get(v.category) ?? 0;
    return {
      valueId: v.id,
      valueName: v.name,
      category: v.category,
      priority: v.priority,
      tasksDue: due,
      tasksCompleted: completed,
      alignmentPct: due === 0 ? null : Math.round((completed / due) * 100),
    };
  });

  // Member activity
  const memberCompletions = new Map<
    string,
    { count: number; cats: Map<TaskCategory, number> }
  >();

  for (const c of completions) {
    const mid = c.completer.id;
    if (!memberCompletions.has(mid)) {
      memberCompletions.set(mid, { count: 0, cats: new Map() });
    }
    const entry = memberCompletions.get(mid)!;
    entry.count++;
    const cat = c.task.category;
    entry.cats.set(cat, (entry.cats.get(cat) ?? 0) + 1);
  }

  const memberActivity: MemberActivity[] = members.map((m) => {
    const entry = memberCompletions.get(m.id);
    if (!entry || entry.count === 0) {
      return {
        memberId: m.id,
        memberName: m.name,
        taskCount: 0,
        topCategory: null,
      };
    }

    // Find top category for this member
    let topCat: TaskCategory | null = null;
    let topCount = 0;
    for (const [cat, count] of entry.cats) {
      if (count > topCount) {
        topCount = count;
        topCat = cat;
      }
    }

    return {
      memberId: m.id,
      memberName: m.name,
      taskCount: entry.count,
      topCategory: topCat,
    };
  });

  const totalDue = Array.from(dueByCat.values()).reduce((a, b) => a + b, 0);
  const totalCompleted = completions.length;

  return {
    boardId,
    weekStart,
    weekEnd,
    totalTasksDue: totalDue,
    totalTasksCompleted: totalCompleted,
    prevWeekCompleted: prevWeekCompletions,
    valueScores,
    memberActivity,
  };
}

// ---------------------------------------------------------------------------
// 4. detectPatternSignals
// ---------------------------------------------------------------------------

export async function detectPatternSignals(
  boardId: string,
  weekEnd: Date,
): Promise<PatternSignal[]> {
  const signals: PatternSignal[] = [];

  // Look back 3 weeks from weekEnd
  const lookbackStart = new Date(weekEnd);
  lookbackStart.setDate(lookbackStart.getDate() - 21);

  // Single aggregation query: get all completions in the 3-week window
  const completions = await prisma.taskHistory.findMany({
    where: {
      board_id: boardId,
      completed_at: { gte: lookbackStart, lte: weekEnd },
    },
    select: {
      completed_by: true,
      completed_at: true,
      task: {
        select: { category: true },
      },
      completer: {
        select: { id: true, name: true },
      },
    },
  });

  if (completions.length === 0) return signals;

  // Bucket completions into weeks (week 0 = most recent, week 2 = oldest)
  const weekBuckets: Array<typeof completions> = [[], [], []];
  for (const c of completions) {
    const daysAgo = Math.floor(
      (weekEnd.getTime() - c.completed_at.getTime()) / (1000 * 60 * 60 * 24),
    );
    const weekIndex = Math.floor(daysAgo / 7);
    if (weekIndex >= 0 && weekIndex < 3) {
      weekBuckets[weekIndex].push(c);
    }
  }

  // --- Workload imbalance (current week = weekBuckets[0]) ---
  const currentWeek = weekBuckets[0];
  if (currentWeek.length > 0) {
    const memberCounts = new Map<string, { name: string; count: number }>();
    for (const c of currentWeek) {
      const entry = memberCounts.get(c.completer.id) ?? {
        name: c.completer.name,
        count: 0,
      };
      entry.count++;
      memberCounts.set(c.completer.id, entry);
    }

    for (const [memberId, { name, count }] of memberCounts) {
      const share = count / currentWeek.length;
      if (share > WORKLOAD_IMBALANCE_THRESHOLD) {
        signals.push({
          type: "workload",
          data: {
            memberId,
            memberName: name,
            share: Math.round(share * 100),
            taskCount: count,
            totalTasks: currentWeek.length,
          },
        });
      }
    }
  }

  // --- Category dominance (current week) ---
  if (currentWeek.length > 0) {
    // Group by category, then check if one member dominates
    const catMembers = new Map<
      TaskCategory,
      Map<string, { name: string; count: number }>
    >();
    for (const c of currentWeek) {
      const cat = c.task.category;
      if (!catMembers.has(cat)) catMembers.set(cat, new Map());
      const memberMap = catMembers.get(cat)!;
      const entry = memberMap.get(c.completer.id) ?? {
        name: c.completer.name,
        count: 0,
      };
      entry.count++;
      memberMap.set(c.completer.id, entry);
    }

    for (const [cat, memberMap] of catMembers) {
      const catTotal = Array.from(memberMap.values()).reduce(
        (sum, e) => sum + e.count,
        0,
      );
      if (catTotal < 2) continue; // Need at least 2 tasks to be meaningful

      for (const [memberId, { name, count }] of memberMap) {
        const share = count / catTotal;
        if (share > CATEGORY_DOMINANCE_THRESHOLD) {
          signals.push({
            type: "dominance",
            data: {
              memberId,
              memberName: name,
              category: cat,
              share: Math.round(share * 100),
              taskCount: count,
              categoryTotal: catTotal,
            },
          });
        }
      }
    }
  }

  // --- Streak detection (category 100% completed for STREAK_WEEKS+ weeks) ---
  // We need board values & tasks to know what was due
  const boardValues = await prisma.boardValue.findMany({
    where: { board_id: boardId },
    select: { category: true, name: true },
  });

  const allTasks = await prisma.task.findMany({
    where: { board_id: boardId },
    select: { category: true, recurrence_rule: true, created_at: true },
  });

  for (const value of boardValues) {
    const cat = value.category;
    let streakCount = 0;
    let neglectCount = 0;

    for (let w = 0; w < STREAK_WEEKS; w++) {
      const wStart = new Date(weekEnd);
      wStart.setDate(wStart.getDate() - (w + 1) * 7 + 1);
      wStart.setHours(0, 0, 0, 0);
      const wEnd = new Date(weekEnd);
      wEnd.setDate(wEnd.getDate() - w * 7);
      wEnd.setHours(23, 59, 59, 999);

      // Tasks due in this category for this week
      let due = 0;
      for (const t of allTasks) {
        if (t.category !== cat) continue;
        if (t.created_at > wEnd) continue;
        due += getOccurrencesInWeek(t.recurrence_rule, wStart, wEnd);
      }

      // Completions in this category for this week
      const completed = weekBuckets[w]?.filter(
        (c) => c.task.category === cat,
      ).length ?? 0;

      if (due > 0 && completed >= due) {
        streakCount++;
      }
      if (due > 0 && completed === 0) {
        neglectCount++;
      }
    }

    if (streakCount >= STREAK_WEEKS) {
      signals.push({
        type: "streak",
        data: {
          category: cat,
          valueName: value.name,
          weeks: streakCount,
        },
      });
    }

    if (neglectCount >= NEGLECT_WEEKS) {
      signals.push({
        type: "neglect",
        data: {
          category: cat,
          valueName: value.name,
          weeks: neglectCount,
        },
      });
    }
  }

  return signals;
}

// ---------------------------------------------------------------------------
// 5. findGapValue
// ---------------------------------------------------------------------------

export function findGapValue(
  scores: Array<{
    valueId: string;
    valueName: string;
    priority: number;
    alignmentPct: number | null;
  }>,
): GapValue | null {
  if (scores.length === 0) return null;

  // Take top 3 by priority (lower number = higher priority)
  const sorted = [...scores].sort((a, b) => a.priority - b.priority);
  const top3 = sorted.slice(0, 3);

  // Filter to those with a numeric alignment score
  const withScores = top3.filter(
    (s): s is typeof s & { alignmentPct: number } => s.alignmentPct !== null,
  );

  if (withScores.length === 0) return null;

  // Find lowest alignment; tie-break by higher priority (lower number)
  withScores.sort((a, b) => {
    if (a.alignmentPct !== b.alignmentPct) {
      return a.alignmentPct - b.alignmentPct;
    }
    return a.priority - b.priority;
  });

  const gap = withScores[0];
  return {
    valueId: gap.valueId,
    valueName: gap.valueName,
    priority: gap.priority,
    alignmentPct: gap.alignmentPct,
  };
}
