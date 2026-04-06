import { NextRequest, NextResponse } from "next/server";
import { withBoardAuth, isAuthError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getWeekBoundaries,
  computeDigestData,
  detectPatternSignals,
  findGapValue,
} from "@/lib/digest";
import { generateInsight } from "@/lib/llm";
import { loadPrompt } from "@/lib/prompts";

// GET — return digest for a given week (or most recent previous week)
export async function GET(request: NextRequest) {
  const auth = await withBoardAuth(request);
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const weekParam = searchParams.get("week");

  // Determine the week to show
  const now = new Date();
  let targetDate: Date;
  if (weekParam) {
    targetDate = new Date(weekParam);
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json({ error: "Invalid week parameter" }, { status: 400 });
    }
  } else {
    // Default: previous week (subtract 7 days from today)
    targetDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  const { weekStart, weekEnd } = getWeekBoundaries(targetDate, auth.board.timezone);

  // Don't allow viewing current or future weeks
  if (weekStart >= now) {
    return NextResponse.json(
      { error: "Digest is only available for past weeks" },
      { status: 400 }
    );
  }

  // Check cold start: when was the first task completion?
  const firstCompletion = await prisma.taskHistory.findFirst({
    where: { board_id: auth.board.id },
    orderBy: { completed_at: "asc" },
    select: { completed_at: true },
  });

  if (!firstCompletion) {
    return NextResponse.json({
      status: "cold_start",
      message: "Hearth is learning your family's patterns. Keep completing tasks — your first digest will appear next week.",
      weekStart: weekStart.toISOString(),
    });
  }

  const daysSinceFirst = Math.floor(
    (weekEnd.getTime() - firstCompletion.completed_at.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Check for cached digest
  const cached = await prisma.weeklyDigest.findUnique({
    where: { board_id_week_start: { board_id: auth.board.id, week_start: weekStart } },
    include: {
      scores: { include: { value: true } },
      insights: true,
    },
  });

  if (cached) {
    // Update last viewed
    await prisma.member.update({
      where: { id: auth.member.id },
      data: { last_viewed_digest_week: weekStart },
    });

    return NextResponse.json({
      status: daysSinceFirst < 14 ? "partial" : "full",
      digest: cached,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
    });
  }

  // Generate new digest
  try {
    const digestData = await computeDigestData(auth.board.id, weekStart, weekEnd);

    // Check if board has values configured
    const values = await prisma.boardValue.findMany({
      where: { board_id: auth.board.id },
      orderBy: { priority: "asc" },
    });

    // Create the digest record
    const digest = await prisma.weeklyDigest.create({
      data: {
        board_id: auth.board.id,
        week_start: weekStart,
        total_tasks_due: digestData.totalTasksDue,
        total_tasks_completed: digestData.totalTasksCompleted,
      },
    });

    // Store value alignment scores from the computed digest data
    for (const vs of digestData.valueScores) {
      await prisma.digestValueScore.create({
        data: {
          digest_id: digest.id,
          value_id: vs.valueId,
          tasks_due: vs.tasksDue,
          tasks_completed: vs.tasksCompleted,
          alignment_pct: vs.alignmentPct,
        },
      });
    }

    // Detect pattern signals and generate insights
    const signals = await detectPatternSignals(auth.board.id, weekEnd);

    // Generate LLM insights (non-blocking, with fallback)
    const gapValue = findGapValue(digestData.valueScores.map((vs) => ({
      valueId: vs.valueId,
      valueName: vs.valueName,
      priority: vs.priority,
      alignmentPct: vs.alignmentPct,
    })));
    const insightsToStore: Array<{ type: string; text: string }> = [];

    // Gap callout
    if (gapValue) {
      let gapText: string | null = null;
      try {
        const gapPrompt = loadPrompt("gap-callout");
        gapText = await generateInsight(
          gapPrompt,
          JSON.stringify({
            valueName: gapValue.valueName,
            priority: gapValue.priority,
            alignmentPct: gapValue.alignmentPct,
            memberNames: digestData.memberActivity.map((m) => m.memberName),
          })
        );
      } catch {
        // fallback below
      }

      insightsToStore.push({
        type: "gap",
        text:
          gapText ||
          `You said ${gapValue.valueName} is a priority, but only ${Math.round(gapValue.alignmentPct ?? 0)}% of ${gapValue.valueName} tasks were completed this week.`,
      });
    }

    // Pattern insights
    if (signals.length > 0) {
      let patternTexts: Array<{ type: string; text: string }> | null = null;
      try {
        const patternPrompt = loadPrompt("pattern-insights");
        const raw = await generateInsight(
          patternPrompt,
          JSON.stringify({
            signals,
            memberActivity: digestData.memberActivity,
          })
        );
        if (raw) {
          try {
            // Strip markdown code fences if present (```json ... ```)
            const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
            patternTexts = JSON.parse(cleaned);
          } catch {
            // LLM returned non-JSON, use as single insight
            patternTexts = [{ type: "observation", text: raw }];
          }
        }
      } catch {
        // fallback below
      }

      if (patternTexts && Array.isArray(patternTexts)) {
        for (const pt of patternTexts) {
          insightsToStore.push({
            type: pt.type || "observation",
            text: pt.text,
          });
        }
      } else {
        // Template fallback for each signal
        for (const signal of signals.slice(0, 3)) {
          insightsToStore.push({
            type: "observation",
            text: formatSignalFallback(signal),
          });
        }
      }
    }

    // Store insights
    for (const insight of insightsToStore) {
      await prisma.digestInsight.create({
        data: {
          digest_id: digest.id,
          type: insight.type,
          text: insight.text,
        },
      });
    }

    // Fetch the complete digest with relations
    const complete = await prisma.weeklyDigest.findUnique({
      where: { id: digest.id },
      include: {
        scores: { include: { value: true } },
        insights: true,
      },
    });

    // Update last viewed
    await prisma.member.update({
      where: { id: auth.member.id },
      data: { last_viewed_digest_week: weekStart },
    });

    return NextResponse.json({
      status: daysSinceFirst < 14 ? "partial" : "full",
      digest: complete,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      memberActivity: digestData.memberActivity,
    });
  } catch (error) {
    console.error("Digest generation failed:", error);
    return NextResponse.json(
      { status: "error", message: "Couldn't generate this week's digest. Try again." },
      { status: 500 }
    );
  }
}

function formatSignalFallback(signal: { type: string; data: Record<string, unknown> }): string {
  switch (signal.type) {
    case "workload":
      return `${signal.data.memberName} completed ${signal.data.share}% of all tasks this week.`;
    case "dominance":
      return `${signal.data.memberName} handles ${signal.data.share}% of ${signal.data.category} tasks.`;
    case "streak":
      return `${signal.data.category} tasks have been fully completed for ${signal.data.weeks} weeks in a row!`;
    case "neglect":
      return `No ${signal.data.category} tasks have been completed in the last ${signal.data.weeks} weeks.`;
    case "time_of_day":
      return `${signal.data.bestTime} tasks are completed ${signal.data.ratio}x more often than ${signal.data.worstTime} tasks.`;
    default:
      return `Pattern detected in ${signal.type}.`;
  }
}
