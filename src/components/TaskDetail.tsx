"use client";

import { useState, useEffect } from "react";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  category: string;
  estimated_duration_minutes: number | null;
  recurrence_rule: string | null;
  next_due_date: string | null;
  is_personal: boolean;
  preferred_time_of_day: string;
  assigned_to: string | null;
  assignee: { id: string; name: string; avatar_color: string } | null;
  creator: { id: string; name: string; avatar_color: string } | null;
};

type HistoryEntry = {
  id: string;
  completed_at: string;
  notes: string | null;
  completer: { name: string; avatar_color: string };
};

type Member = {
  id: string;
  name: string;
  avatar_color: string;
};

export default function TaskDetail({
  task,
  members,
  onClose,
  onUpdate,
  onDelete,
}: {
  task: Task;
  members: Member[];
  onClose: () => void;
  onUpdate: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [category, setCategory] = useState(task.category);
  const [duration, setDuration] = useState(task.estimated_duration_minutes?.toString() || "");
  const [recurrence, setRecurrence] = useState(task.recurrence_rule || "");
  const [assignee, setAssignee] = useState(task.assigned_to || "");
  const [dueDate, setDueDate] = useState(task.next_due_date?.split("T")[0] || "");
  const [isPersonal, setIsPersonal] = useState(task.is_personal);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/tasks/${task.id}/history`)
      .then((r) => r.json())
      .then(setHistory)
      .catch(() => {});
  }, [task.id]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        category,
        estimated_duration_minutes: duration ? parseInt(duration) : null,
        recurrence_rule: recurrence || null,
        assigned_to: assignee || null,
        next_due_date: dueDate || null,
        is_personal: isPersonal,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setEditing(false);
      onUpdate();
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this task?")) return;
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (res.ok) onDelete();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full bg-bg-card shadow-lg sm:w-[400px]">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary sm:hidden"
              aria-label="Back"
            >
              ← Back
            </button>
            <button
              onClick={onClose}
              className="hidden text-text-secondary hover:text-text-primary sm:block"
              aria-label="Close"
            >
              ✕
            </button>
            <div className="flex gap-2">
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-sm text-accent hover:text-accent-hover"
                >
                  Edit
                </button>
              )}
              <button
                onClick={handleDelete}
                className="text-sm text-danger hover:text-red-700"
              >
                Delete
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {editing ? (
              <>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-lg font-medium"
                  autoFocus
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notes..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    <option value="home_maintenance">Home Maintenance</option>
                    <option value="health">Health</option>
                    <option value="errands">Errands</option>
                    <option value="personal">Personal</option>
                    <option value="other">Other</option>
                  </select>
                  <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Duration (min)" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                  <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    <option value="">No recurrence</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Every 2 weeks</option>
                    <option value="monthly">Monthly</option>
                    <option value="every_3_months">Every 3 months</option>
                    <option value="every_6_months">Every 6 months</option>
                    <option value="yearly">Yearly</option>
                  </select>
                  <select value={assignee} onChange={(e) => { setAssignee(e.target.value); if (!e.target.value) setIsPersonal(false); }} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    <option value="">Unassigned</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
                  {assignee && (
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={isPersonal} onChange={(e) => setIsPersonal(e.target.checked)} />
                      Personal
                    </label>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving || !title.trim()} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50">
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button onClick={() => setEditing(false)} className="rounded-lg px-4 py-2 text-sm text-text-secondary hover:bg-gray-100">
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold">{task.title}</h2>
                {task.description && (
                  <p className="text-sm text-text-secondary">{task.description}</p>
                )}
                <div className="space-y-2 text-sm">
                  {task.assignee && (
                    <div className="flex items-center gap-2">
                      <span className="text-text-secondary">Assigned to:</span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-4 w-4 rounded-full" style={{ backgroundColor: task.assignee.avatar_color }} />
                        {task.assignee.name}
                      </span>
                    </div>
                  )}
                  {task.estimated_duration_minutes && (
                    <div><span className="text-text-secondary">Duration:</span> {task.estimated_duration_minutes} min</div>
                  )}
                  {task.recurrence_rule && (
                    <div><span className="text-text-secondary">Recurrence:</span> {task.recurrence_rule.replace(/_/g, " ")}</div>
                  )}
                  {task.next_due_date && (
                    <div><span className="text-text-secondary">Due:</span> {new Date(task.next_due_date).toLocaleDateString()}</div>
                  )}
                  <div><span className="text-text-secondary">Category:</span> {task.category.replace(/_/g, " ")}</div>
                  <div><span className="text-text-secondary">Status:</span> {task.status}</div>
                </div>
              </>
            )}

            {/* Completion history */}
            {history.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <h3 className="mb-2 text-sm font-medium text-text-secondary">
                  Completion History
                </h3>
                <div className="space-y-2">
                  {history.map((h) => (
                    <div key={h.id} className="flex items-center gap-2 text-sm">
                      <span
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: h.completer.avatar_color }}
                      />
                      <span>{h.completer.name}</span>
                      <span className="text-text-secondary">
                        {new Date(h.completed_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
