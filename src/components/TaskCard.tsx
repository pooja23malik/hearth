"use client";

import { useState, useEffect } from "react";
import type { Task } from "@/lib/types";

const RECURRENCE_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  every_3_months: "Every 3 months",
  every_6_months: "Every 6 months",
  yearly: "Yearly",
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function isOverdue(task: Task): boolean {
  if (!task.next_due_date || task.status !== "pending") return false;
  return new Date(task.next_due_date) < new Date();
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

type CompletionResult = { recurring: boolean; nextDue?: string } | null;

export default function TaskCard({
  task,
  onComplete,
  onClick,
}: {
  task: Task;
  onComplete: (id: string) => Promise<CompletionResult>;
  onClick: (task: Task) => void;
}) {
  const [completing, setCompleting] = useState(false);
  // Celebration state: "done" for non-recurring, "recurring" for recurring (shows next date)
  const [celebration, setCelebration] = useState<null | "done" | "recurring">(null);
  const [nextDueDate, setNextDueDate] = useState<string | null>(null);
  const overdue = isOverdue(task);

  // Reset states when task data changes from the server (list refresh)
  useEffect(() => {
    if (task.status === "pending" && !celebration) {
      setCompleting(false);
    }
  }, [task.status, task.completed_at, celebration]);

  async function handleComplete(e: React.MouseEvent) {
    e.stopPropagation();
    if (completing || celebration || task.status === "completed") return;
    setCompleting(true);

    const result = await onComplete(task.id);

    if (!result) {
      // Failed — reset
      setCompleting(false);
      return;
    }

    if (result.recurring) {
      // Recurring: show celebration with next date, then reset after delay
      setCelebration("recurring");
      setNextDueDate(result.nextDue || null);
      setTimeout(() => {
        setCelebration(null);
        setCompleting(false);
        setNextDueDate(null);
      }, 2000);
    } else {
      // Non-recurring: show "Done!" briefly
      setCelebration("done");
      setTimeout(() => {
        setCelebration(null);
        setCompleting(false);
      }, 1500);
    }
  }

  const showChecked = task.status === "completed" || completing || celebration !== null;
  const showStrikethrough = task.status === "completed" || celebration !== null;
  const isCelebrating = celebration !== null;

  return (
    <div
      onClick={() => !isCelebrating && onClick(task)}
      className={`relative flex items-start gap-3 rounded-xl bg-bg-card p-4 shadow-sm transition-all cursor-pointer hover:shadow-md ${
        task.status === "completed" && !isCelebrating ? "opacity-50" : ""
      } ${isCelebrating ? "ring-2 ring-accent/30" : ""}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && !isCelebrating && onClick(task)}
    >
      {/* Checkbox */}
      <button
        onClick={handleComplete}
        disabled={completing || task.status === "completed" || isCelebrating}
        className={`mt-0.5 flex h-6 w-6 min-w-[24px] items-center justify-center rounded-md border-2 transition-all duration-300 ${
          showChecked
            ? "border-accent bg-accent text-white scale-110"
            : "border-gray-300 hover:border-accent"
        }`}
        aria-label={`Complete ${task.title}`}
        style={{ minHeight: "44px", minWidth: "44px", padding: "9px" }}
      >
        {showChecked && (
          <svg
            viewBox="0 0 12 12"
            className={`h-3 w-3 transition-transform duration-300 ${
              isCelebrating ? "scale-125" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M2 6l3 3 5-5" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-base font-medium transition-all duration-300 ${
            showStrikethrough ? "line-through text-text-secondary" : ""
          }`}
        >
          {task.title}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {/* Celebration message — replaces normal badges during celebration */}
          {celebration === "done" && (
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent animate-[fadeIn_0.3s_ease-out]">
              Done!
            </span>
          )}

          {celebration === "recurring" && (
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent animate-[fadeIn_0.3s_ease-out]">
              Done! Next: {nextDueDate ? formatShortDate(nextDueDate) : "soon"}
            </span>
          )}

          {/* Normal badges — hidden during celebration */}
          {!isCelebrating && (
            <>
              {task.assignee && (
                <span className="text-sm text-text-secondary">
                  {task.assignee.name}
                </span>
              )}

              {task.estimated_duration_minutes && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-text-secondary">
                  {formatDuration(task.estimated_duration_minutes)}
                </span>
              )}

              {task.recurrence_rule && (
                <span className="rounded-full bg-badge-recurring px-2 py-0.5 text-xs text-accent">
                  {RECURRENCE_LABELS[task.recurrence_rule] || task.recurrence_rule}
                </span>
              )}

              {task.is_personal && (
                <span className="rounded-full bg-badge-personal px-2 py-0.5 text-xs text-purple-700">
                  Personal
                </span>
              )}

              {overdue && task.next_due_date && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-danger">
                  Overdue
                </span>
              )}

              {task.next_due_date && !overdue && task.status === "pending" && (
                <span className="text-xs text-text-secondary">
                  Due {formatShortDate(task.next_due_date)}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
