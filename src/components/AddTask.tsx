"use client";

import { useState } from "react";

type Member = {
  id: string;
  name: string;
  avatar_color: string;
};

const CATEGORIES = [
  { value: "home_maintenance", label: "Home Maintenance" },
  { value: "health", label: "Health" },
  { value: "errands", label: "Errands" },
  { value: "personal", label: "Personal" },
  { value: "other", label: "Other" },
];

const RECURRENCE_OPTIONS = [
  { value: "", label: "No recurrence" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "every_3_months", label: "Every 3 months" },
  { value: "every_6_months", label: "Every 6 months" },
  { value: "yearly", label: "Yearly" },
];

export default function AddTask({
  members,
  currentMemberId,
  onAdd,
}: {
  members: Member[];
  currentMemberId: string;
  onAdd: () => void;
}) {
  const [title, setTitle] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [category, setCategory] = useState("other");
  const [duration, setDuration] = useState("");
  const [recurrence, setRecurrence] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isPersonal, setIsPersonal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError("");

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        category,
        estimated_duration_minutes: duration ? parseInt(duration) : null,
        recurrence_rule: recurrence || null,
        assigned_to: assignee || null,
        next_due_date: dueDate || null,
        is_personal: isPersonal,
      }),
    });

    if (res.ok) {
      setTitle("");
      setExpanded(false);
      setCategory("other");
      setDuration("");
      setRecurrence("");
      setAssignee("");
      setDueDate("");
      setIsPersonal(false);
      onAdd();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to add task");
    }
    setLoading(false);
  }

  function handleQuickAdd(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !expanded && title.trim()) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleQuickAdd}
          placeholder="+ Add a task..."
          className="flex-1 bg-transparent text-base placeholder:text-text-secondary/50 focus:outline-none"
          disabled={loading}
        />
        {!expanded && title.trim() && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-sm text-text-secondary hover:text-accent"
            title="Add details"
          >
            ···
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-3 grid gap-3 border-t border-gray-100 pt-3 sm:grid-cols-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="Duration (minutes)"
            min="1"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />

          <select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            {RECURRENCE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          <select
            value={assignee}
            onChange={(e) => {
              setAssignee(e.target.value);
              if (!e.target.value) setIsPersonal(false);
            }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />

          {assignee && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isPersonal}
                onChange={(e) => setIsPersonal(e.target.checked)}
                className="rounded"
              />
              Personal task (only visible to assignee)
            </label>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      {(expanded || title.trim()) && (
        <div className="mt-3 flex justify-end gap-2">
          {expanded && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="rounded-lg px-3 py-1.5 text-sm text-text-secondary hover:bg-gray-100"
            >
              Collapse
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add Task"}
          </button>
        </div>
      )}
    </form>
  );
}
