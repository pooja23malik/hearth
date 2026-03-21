"use client";

import { useState } from "react";

type Member = {
  id: string;
  name: string;
  avatar_color: string;
  is_creator: boolean;
};

export default function BoardSettings({
  boardName,
  inviteToken,
  members,
  isCreator,
  onClose,
  onUpdate,
}: {
  boardName: string;
  inviteToken: string;
  members: Member[];
  isCreator: boolean;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/board/${inviteToken}`
      : "";

  async function copyLink() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function regenerateLink() {
    if (!confirm("Regenerate invite link? The old link will stop working.")) return;
    setRegenerating(true);
    const res = await fetch(`/api/board/${inviteToken}/regenerate`, { method: "POST" });
    if (res.ok) {
      onUpdate();
    }
    setRegenerating(false);
  }

  async function removeMember(id: string, name: string) {
    if (!confirm(`Remove ${name}? Their tasks will be unassigned.`)) return;
    const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
    if (res.ok) onUpdate();
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full bg-bg-card shadow-lg sm:w-[400px]">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h2 className="text-lg font-semibold">{boardName}</h2>
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Invite link */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-text-secondary">
                Share with your family
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteUrl}
                  readOnly
                  className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                />
                <button
                  onClick={copyLink}
                  className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              {isCreator && (
                <button
                  onClick={regenerateLink}
                  disabled={regenerating}
                  className="mt-2 text-sm text-text-secondary hover:text-danger"
                >
                  {regenerating ? "Regenerating..." : "Regenerate link"}
                </button>
              )}
            </div>

            {/* Members */}
            <div>
              <h3 className="mb-2 text-sm font-medium text-text-secondary">
                Members
              </h3>
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: m.avatar_color }}
                      >
                        {m.name[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{m.name}</span>
                      {m.is_creator && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-text-secondary">
                          Creator
                        </span>
                      )}
                    </div>
                    {isCreator && !m.is_creator && (
                      <button
                        onClick={() => removeMember(m.id, m.name)}
                        className="text-sm text-text-secondary hover:text-danger"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
