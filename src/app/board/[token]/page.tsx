"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import MemberPicker from "@/components/MemberPicker";
import TaskCard from "@/components/TaskCard";
import AddTask from "@/components/AddTask";
import TaskDetail from "@/components/TaskDetail";
import BoardSettings from "@/components/BoardSettings";

import type { Member, Task, Board } from "@/lib/types";

const TABS = [
  { key: "all", label: "All" },
  { key: "my", label: "My Tasks" },
  { key: "overdue", label: "Overdue" },
] as const;

export default function BoardPage() {
  const params = useParams<{ token: string }>();
  const [board, setBoard] = useState<Board | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tab, setTab] = useState<"all" | "my" | "overdue">("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Check if we have a member cookie
  const currentMemberId =
    typeof document !== "undefined"
      ? document.cookie.match(/memberId=([^;]+)/)?.[1] || null
      : null;

  const loadBoard = useCallback(async () => {
    const res = await fetch(`/api/board/${params.token}`);
    if (!res.ok) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setBoard(data);
    setLoading(false);
  }, [params.token]);

  const loadTasks = useCallback(async () => {
    const res = await fetch(`/api/tasks?tab=${tab}`);
    if (res.ok) {
      const data = await res.json();
      setTasks(data);
    }
  }, [tab]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    if (authenticated) loadTasks();
  }, [authenticated, tab, loadTasks]);

  // Check auth on mount
  useEffect(() => {
    if (currentMemberId && board) {
      const isMember = board.members.some((m) => m.id === currentMemberId);
      if (isMember) setAuthenticated(true);
    }
  }, [currentMemberId, board]);

  // SSE connection
  useEffect(() => {
    if (!authenticated) return;

    const eventSource = new EventSource("/api/events");

    eventSource.addEventListener("task:created", () => loadTasks());
    eventSource.addEventListener("task:updated", () => loadTasks());
    eventSource.addEventListener("task:completed", () => loadTasks());
    eventSource.addEventListener("task:deleted", () => loadTasks());

    eventSource.onerror = () => {
      // Auto-reconnect is built into EventSource
      // On reconnect, refetch all tasks
      setTimeout(() => loadTasks(), 1000);
    };

    return () => eventSource.close();
  }, [authenticated, loadTasks]);

  async function handleComplete(taskId: string) {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    if (res.ok) loadTasks();
  }

  function handleMemberSelected() {
    setAuthenticated(true);
    loadBoard(); // Refresh member list
  }

  // Update page title
  useEffect(() => {
    if (board) {
      document.title = `${board.name} — Family Tasks`;
    }
  }, [board]);

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <h1 className="mb-2 text-xl font-semibold">Board not found</h1>
          <p className="mb-4 text-text-secondary">
            This link may have been updated. Ask a family member for the new link.
          </p>
          <a href="/" className="text-accent hover:text-accent-hover">
            Create a new board
          </a>
        </div>
      </main>
    );
  }

  if (!board) return null;

  if (!authenticated) {
    return (
      <MemberPicker
        boardId={board.id}
        members={board.members}
        onSelect={handleMemberSelected}
      />
    );
  }

  const currentMember = board.members.find((m) => m.id === currentMemberId);
  const overdueCount = tasks.filter(
    (t) => t.status === "pending" && t.next_due_date && new Date(t.next_due_date) < new Date()
  ).length;

  return (
    <main className="mx-auto max-w-2xl px-4 py-4">
      {/* Header */}
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{board.name}</h1>
        <div className="flex items-center gap-2">
          {/* Member avatars */}
          <div className="flex -space-x-1">
            {board.members.slice(0, 4).map((m) => (
              <div
                key={m.id}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-bg-primary text-xs font-medium text-white"
                style={{ backgroundColor: m.avatar_color }}
                title={m.name}
              >
                {m.name[0].toUpperCase()}
              </div>
            ))}
            {board.members.length > 4 && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-bg-primary bg-gray-200 text-xs text-text-secondary">
                +{board.members.length - 4}
              </div>
            )}
          </div>

          {/* Settings gear */}
          <button
            onClick={() => setShowSettings(true)}
            className="rounded-lg p-2 text-text-secondary hover:bg-gray-100 hover:text-text-primary"
            aria-label="Board settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="mb-4 flex border-b border-gray-200" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "text-accent"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {t.label}
            {t.key === "overdue" && overdueCount > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-danger px-1.5 text-xs text-white">
                {overdueCount}
              </span>
            )}
            {tab === t.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
            )}
          </button>
        ))}
      </nav>

      {/* Task list */}
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="py-12 text-center">
            {tab === "all" && (
              <>
                <p className="text-lg text-text-secondary">
                  Add your first task — what needs doing this week?
                </p>
                <p className="mt-1 text-sm text-text-secondary/60">↓</p>
              </>
            )}
            {tab === "my" && (
              <p className="text-lg text-text-secondary">
                No tasks assigned to you yet
              </p>
            )}
            {tab === "overdue" && (
              <p className="text-lg text-text-secondary">
                All caught up!
              </p>
            )}
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={handleComplete}
              onClick={setSelectedTask}
            />
          ))
        )}
      </div>

      {/* Add task */}
      <div className="sticky bottom-4 mt-4">
        <AddTask
          members={board.members}
          currentMemberId={currentMemberId || ""}
          onAdd={loadTasks}
        />
      </div>

      {/* Task detail panel */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          members={board.members}
          onClose={() => setSelectedTask(null)}
          onUpdate={() => { loadTasks(); setSelectedTask(null); }}
          onDelete={() => { loadTasks(); setSelectedTask(null); }}
        />
      )}

      {/* Board settings */}
      {showSettings && (
        <BoardSettings
          boardName={board.name}
          inviteToken={board.invite_token}
          members={board.members}
          isCreator={currentMember?.is_creator || false}
          onClose={() => setShowSettings(false)}
          onUpdate={() => { loadBoard(); setShowSettings(false); }}
        />
      )}
    </main>
  );
}
