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

export default function TaskCard({
  task,
  onComplete,
  onClick,
}: {
  task: Task;
  onComplete: (id: string) => void;
  onClick: (task: Task) => void;
}) {
  const [completing, setCompleting] = useState(false);
  const overdue = isOverdue(task);

  // Reset completing state when task status changes (e.g., recurring task resets to pending)
  useEffect(() => {
    if (task.status === "pending") {
      setCompleting(false);
    }
  }, [task.status, task.completed_at]);

  async function handleComplete(e: React.MouseEvent) {
    e.stopPropagation();
    if (completing || task.status === "completed") return;
    setCompleting(true);
    onComplete(task.id);
  }

  return (
    <div
      onClick={() => onClick(task)}
      className={`flex items-start gap-3 rounded-xl bg-bg-card p-4 shadow-sm transition-all cursor-pointer hover:shadow-md ${
        task.status === "completed" ? "opacity-50" : ""
      }`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick(task)}
    >
      {/* Checkbox */}
      <button
        onClick={handleComplete}
        disabled={completing || task.status === "completed"}
        className={`mt-0.5 flex h-6 w-6 min-w-[24px] items-center justify-center rounded-md border-2 transition-colors ${
          task.status === "completed"
            ? "border-success bg-success text-white"
            : completing
              ? "border-accent animate-pulse"
              : "border-gray-300 hover:border-accent"
        }`}
        aria-label={`Complete ${task.title}`}
        style={{ minHeight: "44px", minWidth: "44px", padding: "9px" }}
      >
        {(task.status === "completed" || completing) && (
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 6l3 3 5-5" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-base font-medium ${
            task.status === "completed" ? "line-through text-text-secondary" : ""
          }`}
        >
          {task.title}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
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
              Due {new Date(task.next_due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
