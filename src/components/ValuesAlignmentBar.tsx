"use client";

type Props = {
  name: string;
  alignmentPct: number | null;
  streakWeeks?: number;
  sparklineData?: (number | null)[];
};

function getBarColor(pct: number): string {
  if (pct >= 70) return "var(--color-alignment-on-track)";
  if (pct >= 40) return "var(--color-alignment-slipping)";
  return "var(--color-alignment-gap)";
}

function Sparkline({ data }: { data: (number | null)[] }) {
  const validPoints = data.filter((d): d is number => d !== null);
  if (validPoints.length < 2) return null;

  const width = 60;
  const height = 24;
  const max = Math.max(...validPoints, 100);
  const min = Math.min(...validPoints, 0);
  const range = max - min || 1;

  const points = data
    .map((d, i) => {
      if (d === null) return null;
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d - min) / range) * height;
      return `${x},${y}`;
    })
    .filter(Boolean)
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      className="inline-block ml-2"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ValuesAlignmentBar({
  name,
  alignmentPct,
  streakWeeks,
  sparklineData,
}: Props) {
  if (alignmentPct === null) {
    return (
      <div className="flex items-center gap-2.5 mb-2.5">
        <span className="text-[13px] font-medium w-[100px] truncate">{name}</span>
        <div className="flex-1 text-[12px] text-text-secondary">No tasks this week</div>
      </div>
    );
  }

  const barColor = getBarColor(alignmentPct);

  return (
    <div className="flex items-center gap-2.5 mb-2.5">
      <span className="text-[13px] font-medium w-[100px] truncate">{name}</span>
      <div
        className="flex-1 h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: "rgba(122,112,104,0.1)" }}
        role="progressbar"
        aria-valuenow={Math.round(alignmentPct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${name}: ${Math.round(alignmentPct)}%`}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${Math.min(alignmentPct, 100)}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
      <span
        className="text-[12px] text-text-secondary w-9 text-right"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {Math.round(alignmentPct)}%
      </span>
      {sparklineData && sparklineData.length >= 4 && (
        <Sparkline data={sparklineData} />
      )}
      {streakWeeks && streakWeeks >= 3 && (
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: "var(--color-streak-bg)",
            color: "var(--color-streak-text)",
          }}
        >
          {streakWeeks}w streak
        </span>
      )}
    </div>
  );
}
