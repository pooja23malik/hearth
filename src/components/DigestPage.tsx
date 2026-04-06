"use client";

import { useState, useEffect, useCallback } from "react";
import ValuesOnboarding from "./ValuesOnboarding";
import ValuesAlignmentBar from "./ValuesAlignmentBar";
import GapCallout from "./GapCallout";
import InsightCard from "./InsightCard";

type DigestScore = {
  id: string;
  tasks_due: number;
  tasks_completed: number;
  alignment_pct: number | null;
  value: { id: string; name: string; priority: number; category: string };
};

type DigestInsight = {
  id: string;
  type: string;
  text: string;
};

type DigestData = {
  id: string;
  total_tasks_due: number;
  total_tasks_completed: number;
  scores: DigestScore[];
  insights: DigestInsight[];
};

type DigestResponse = {
  status: "cold_start" | "partial" | "full" | "error";
  message?: string;
  digest?: DigestData;
  weekStart?: string;
  weekEnd?: string;
  memberActivity?: Array<{
    memberId: string;
    name: string;
    avatarColor: string;
    count: number;
    topCategory: string;
  }>;
};

type Member = {
  id: string;
  name: string;
  avatar_color: string;
};

type Props = {
  boardToken: string;
  members: Member[];
  isCreator: boolean;
};

export default function DigestPage({ boardToken, members, isCreator }: Props) {
  const [digest, setDigest] = useState<DigestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentWeek, setCurrentWeek] = useState<string | null>(null);
  const [hasValues, setHasValues] = useState<boolean | null>(null);

  const loadDigest = useCallback(
    async (weekParam?: string) => {
      setLoading(true);
      const url = weekParam
        ? `/api/board/${boardToken}/digest?week=${weekParam}`
        : `/api/board/${boardToken}/digest`;
      try {
        const res = await fetch(url);
        const data: DigestResponse = await res.json();
        setDigest(data);
        if (data.weekStart) setCurrentWeek(data.weekStart);
      } catch {
        setDigest({ status: "error", message: "Couldn't load digest." });
      }
      setLoading(false);
    },
    [boardToken]
  );

  const checkValues = useCallback(async () => {
    const res = await fetch(`/api/board/${boardToken}/values`);
    if (res.ok) {
      const data = await res.json();
      setHasValues(data.values.length > 0);
      if (data.values.length === 0 && isCreator) {
        setShowOnboarding(true);
      }
    }
  }, [boardToken, isCreator]);

  useEffect(() => {
    checkValues().then(() => loadDigest());
  }, [checkValues, loadDigest]);

  function navigateWeek(direction: -1 | 1) {
    if (!currentWeek) return;
    const date = new Date(currentWeek);
    date.setDate(date.getDate() + direction * 7);
    // Don't navigate to current or future weeks
    const now = new Date();
    if (date >= now) return;
    loadDigest(date.toISOString().split("T")[0]);
  }

  function formatWeekRange(weekStart: string, weekEnd?: string): string {
    const start = new Date(weekStart);
    const end = weekEnd ? new Date(weekEnd) : new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${start.toLocaleDateString("en-US", opts)} - ${end.toLocaleDateString("en-US", opts)}, ${start.getFullYear()}`;
  }

  // Values onboarding modal
  if (showOnboarding) {
    return (
      <ValuesOnboarding
        boardToken={boardToken}
        onComplete={() => {
          setShowOnboarding(false);
          setHasValues(true);
          loadDigest();
        }}
        onClose={() => setShowOnboarding(false)}
      />
    );
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4 py-4">
        <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-8 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-8 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-8 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-20 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-16 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-16 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  // Cold start
  if (digest?.status === "cold_start") {
    return (
      <div className="py-12 text-center">
        <p className="font-[family-name:var(--font-display)] text-lg text-text-secondary">
          {digest.message}
        </p>
      </div>
    );
  }

  // Error
  if (digest?.status === "error") {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-text-secondary">{digest.message}</p>
        <button
          onClick={() => loadDigest(currentWeek || undefined)}
          className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  // No values CTA
  if (hasValues === false && !showOnboarding) {
    return (
      <div className="py-8">
        {/* Show basic stats if digest exists */}
        {digest?.digest && <DigestStats digest={digest} />}
        <div
          className="mt-6 rounded-xl p-6 text-center"
          style={{
            backgroundColor: "var(--color-insight-tag-bg)",
            border: "1px solid rgba(43,138,138,0.15)",
          }}
        >
          <p className="mb-3 font-[family-name:var(--font-display)] text-lg font-semibold">
            Set your family values
          </p>
          <p className="mb-4 text-sm text-text-secondary">
            Unlock alignment insights by telling Hearth what matters most to your family.
          </p>
          {isCreator ? (
            <button
              onClick={() => setShowOnboarding(true)}
              className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white"
            >
              Set values
            </button>
          ) : (
            <p className="text-sm text-text-secondary">
              Ask the board creator to set family values.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!digest?.digest) return null;

  const d = digest.digest;
  const pct =
    d.total_tasks_due > 0
      ? Math.round((d.total_tasks_completed / d.total_tasks_due) * 100)
      : 0;

  const gapInsight = d.insights.find((i) => i.type === "gap");
  const patternInsights = d.insights.filter((i) => i.type !== "gap");
  const sortedScores = [...d.scores].sort(
    (a, b) => a.value.priority - b.value.priority
  );

  return (
    <div className="py-4">
      {/* Week navigation + hero */}
      <div className="mb-6 text-center">
        <div className="mb-1 flex items-center justify-center gap-4">
          <button
            onClick={() => navigateWeek(-1)}
            className="rounded-lg p-1.5 text-text-secondary hover:text-text-primary"
            aria-label="Previous week"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <span className="text-[12px] font-medium text-text-secondary">
            {digest.weekStart && formatWeekRange(digest.weekStart, digest.weekEnd)}
          </span>
          <button
            onClick={() => navigateWeek(1)}
            className="rounded-lg p-1.5 text-text-secondary hover:text-text-primary"
            aria-label="Next week"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Hero percentage */}
        <div
          className="font-[family-name:var(--font-display)] text-[64px] font-bold leading-none"
          style={{ color: "var(--color-accent)" }}
        >
          {pct}%
        </div>
        <p className="mt-1 text-[14px] text-text-secondary">
          {d.total_tasks_completed} of {d.total_tasks_due} tasks completed
        </p>
      </div>

      {/* Values Alignment */}
      {sortedScores.length > 0 && (
        <section aria-label="Values alignment" className="mb-6">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            Values Alignment
          </h3>
          {sortedScores.map((score) => (
            <ValuesAlignmentBar
              key={score.id}
              name={score.value.name}
              alignmentPct={score.alignment_pct}
            />
          ))}
        </section>
      )}

      {/* Gap Callout */}
      {gapInsight && <GapCallout text={gapInsight.text} />}

      {/* Pattern Insights */}
      {patternInsights.length > 0 && (
        <section aria-label="Patterns" className="mb-6">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            Patterns
          </h3>
          {patternInsights.map((insight) => (
            <InsightCard key={insight.id} text={insight.text} type={insight.type} />
          ))}
        </section>
      )}

      {/* Family Activity */}
      {digest.memberActivity && digest.memberActivity.length > 0 && (
        <section aria-label="Family activity" className="mb-4">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            Family Activity
          </h3>
          {digest.memberActivity.map((m) => (
            <div key={m.memberId} className="mb-2 flex items-center gap-2.5">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: m.avatarColor }}
              >
                {m.name[0].toUpperCase()}
              </div>
              <span className="flex-1 text-[14px]">{m.name}</span>
              <span
                className="text-[14px] text-text-secondary"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {m.count} tasks
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function DigestStats({ digest }: { digest: DigestResponse }) {
  if (!digest.digest) return null;
  const d = digest.digest;
  return (
    <div className="flex gap-3">
      <div className="flex-1 rounded-xl bg-bg-card p-4 shadow-sm">
        <div className="text-[11px] uppercase tracking-wider text-text-secondary">Completed</div>
        <div className="text-[22px] font-bold">{d.total_tasks_completed}</div>
      </div>
      <div className="flex-1 rounded-xl bg-bg-card p-4 shadow-sm">
        <div className="text-[11px] uppercase tracking-wider text-text-secondary">Due</div>
        <div className="text-[22px] font-bold">{d.total_tasks_due}</div>
      </div>
    </div>
  );
}
