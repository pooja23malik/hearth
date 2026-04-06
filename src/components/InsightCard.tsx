"use client";

type Props = {
  text: string;
  type: string;
};

const TYPE_LABELS: Record<string, string> = {
  observation: "Observation",
  suggestion: "Suggestion",
  streak: "Streak",
  gap: "Gap",
};

export default function InsightCard({ text, type }: Props) {
  return (
    <div
      className="rounded-xl p-3.5 mb-2.5"
      style={{
        backgroundColor: "var(--color-bg-card)",
        border: "1.5px solid var(--color-insight-border)",
      }}
    >
      <p className="text-[14px] leading-relaxed">{text}</p>
      <span
        className="inline-block mt-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
        style={{
          backgroundColor: "var(--color-insight-tag-bg)",
          color: "var(--color-insight-tag-text)",
        }}
      >
        {TYPE_LABELS[type] || type}
      </span>
    </div>
  );
}
