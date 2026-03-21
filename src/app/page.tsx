"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [boardName, setBoardName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!boardName.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: boardName.trim() }),
      });

      if (!res.ok) {
        throw new Error("Failed to create board");
      }

      const data = await res.json();
      router.push(`/board/${data.invite_token}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="mb-2 text-3xl font-semibold text-text-primary">
          Family tasks, finally organized.
        </h1>
        <p className="mb-8 text-text-secondary">
          Create a shared board for your family. No signup required.
        </p>

        <form onSubmit={handleCreate} className="space-y-4">
          <input
            type="text"
            value={boardName}
            onChange={(e) => setBoardName(e.target.value)}
            placeholder="Your family name (e.g., Malik Family)"
            className="w-full rounded-xl border border-gray-200 bg-bg-card px-4 py-3 text-lg shadow-sm placeholder:text-text-secondary/50 focus:border-accent focus:ring-0"
            autoFocus
            disabled={loading}
          />

          {error && (
            <p className="text-sm text-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !boardName.trim()}
            className="w-full rounded-lg bg-accent px-4 py-3 text-lg font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Board"}
          </button>
        </form>
      </div>
    </main>
  );
}
