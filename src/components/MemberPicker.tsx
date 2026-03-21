"use client";

import { useState } from "react";

const AVATAR_COLORS = [
  { name: "Coral", value: "#D4604A" },
  { name: "Teal", value: "#2B8A8A" },
  { name: "Purple", value: "#7C5CBF" },
  { name: "Amber", value: "#C4890E" },
  { name: "Sage", value: "#5A8A5A" },
  { name: "Sky", value: "#4A8AB5" },
  { name: "Rose", value: "#B54A6D" },
  { name: "Stone", value: "#8A8A7A" },
];

type Member = {
  id: string;
  name: string;
  avatar_color: string;
  is_creator: boolean;
};

export default function MemberPicker({
  boardId,
  members,
  onSelect,
}: {
  boardId: string;
  members: Member[];
  onSelect: () => void;
}) {
  const [mode, setMode] = useState<"pick" | "create">(
    members.length === 0 ? "create" : "pick"
  );
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0].value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function selectMember(memberId: string) {
    setLoading(true);
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ board_id: boardId, member_id: memberId }),
    });
    if (res.ok) onSelect();
    else setLoading(false);
  }

  async function createMember(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError("");

    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        board_id: boardId,
        name: name.trim(),
        avatar_color: selectedColor,
      }),
    });

    if (res.ok) {
      onSelect();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to create member");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl bg-bg-card p-6 shadow-md">
        <h2 className="mb-6 text-center text-xl font-semibold">
          {members.length === 0 ? "Create your profile" : "Who are you?"}
        </h2>

        {mode === "pick" && (
          <div className="space-y-3">
            {members.map((m) => (
              <button
                key={m.id}
                onClick={() => selectMember(m.id)}
                disabled={loading}
                className="flex w-full items-center gap-3 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: m.avatar_color }}
                >
                  {m.name[0].toUpperCase()}
                </div>
                <span className="text-base font-medium">{m.name}</span>
              </button>
            ))}

            <button
              onClick={() => setMode("create")}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 p-3 text-text-secondary transition-colors hover:border-accent hover:text-accent"
            >
              <span className="text-lg">+</span>
              <span>Add yourself</span>
            </button>
          </div>
        )}

        {mode === "create" && (
          <form onSubmit={createMember} className="space-y-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-base placeholder:text-text-secondary/50 focus:border-accent focus:ring-0"
              autoFocus
              disabled={loading}
            />

            <div>
              <label className="mb-2 block text-sm text-text-secondary">
                Pick a color
              </label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setSelectedColor(c.value)}
                    className={`h-9 w-9 rounded-full transition-transform ${
                      selectedColor === c.value
                        ? "scale-110 ring-2 ring-offset-2"
                        : "hover:scale-105"
                    }`}
                    style={{
                      backgroundColor: c.value,
                      ringColor: c.value,
                    }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {loading ? "Joining..." : members.length === 0 ? "Create & Join" : "Join Board"}
            </button>

            {members.length > 0 && (
              <button
                type="button"
                onClick={() => setMode("pick")}
                className="w-full text-sm text-text-secondary hover:text-text-primary"
              >
                Back to member list
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
