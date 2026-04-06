"use client";

import { useState, useCallback } from "react";
import type { TaskCategory } from "@prisma/client";

type PresetValue = { name: string; category: TaskCategory };

const PRESETS: PresetValue[] = [
  { name: "Clean home", category: "home_maintenance" },
  { name: "Health & wellness", category: "health" },
  { name: "Errands & logistics", category: "errands" },
  { name: "Personal growth", category: "personal" },
  { name: "Other", category: "other" },
];

type Props = {
  boardToken: string;
  onComplete: () => void;
  onClose?: () => void;
};

export default function ValuesOnboarding({ boardToken, onComplete, onClose }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<Set<TaskCategory>>(new Set());
  const [ranked, setRanked] = useState<PresetValue[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function toggleValue(category: TaskCategory) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else if (next.size < 5) {
        next.add(category);
      }
      return next;
    });
  }

  function goToRanking() {
    const selectedValues = PRESETS.filter((p) => selected.has(p.category));
    setRanked(selectedValues);
    setStep(2);
  }

  const moveItem = useCallback(
    (index: number, direction: -1 | 1) => {
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= ranked.length) return;
      setRanked((prev) => {
        const next = [...prev];
        [next[index], next[newIndex]] = [next[newIndex], next[index]];
        return next;
      });
    },
    [ranked.length]
  );

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const values = ranked.map((v, i) => ({
        name: v.name,
        category: v.category,
        priority: i + 1,
      }));

      const res = await fetch(`/api/board/${boardToken}/values`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Couldn't save values. Try again.");
        setSaving(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => onComplete(), 1500);
    } catch {
      setError("Couldn't save values. Try again.");
      setSaving(false);
    }
  }

  // Success state
  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="mx-4 w-full max-w-md rounded-2xl bg-bg-card p-8 text-center shadow-lg">
          <div className="mb-4 text-4xl">&#10003;</div>
          <p className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Values saved
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Hearth will start learning your patterns
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-bg-card p-6 shadow-lg">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
              {step === 1 ? "What matters most?" : "Rank your priorities"}
            </h2>
            {onClose && (
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-text-secondary hover:text-text-primary"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
          {/* Step indicator */}
          <div className="flex gap-1.5">
            <div className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-accent" : "bg-gray-200"}`} />
            <div className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-accent" : "bg-gray-200"}`} />
          </div>
        </div>

        {step === 1 ? (
          <>
            <p className="mb-4 text-sm text-text-secondary">
              This is just for your family. Pick what matters, and Hearth will track
              how your time aligns with your priorities.
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {PRESETS.map((preset) => {
                const isSelected = selected.has(preset.category);
                return (
                  <button
                    key={preset.category}
                    onClick={() => toggleValue(preset.category)}
                    role="checkbox"
                    aria-checked={isSelected}
                    className={`rounded-full border-[1.5px] px-5 py-2.5 text-[14px] font-medium transition-all ${
                      isSelected
                        ? "border-accent bg-accent text-white scale-[1.02]"
                        : "border-[var(--color-chip-unselected-border)] text-text-secondary hover:border-accent hover:text-accent"
                    }`}
                    style={{ minHeight: "44px" }}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>
            <p className="mb-4 text-xs text-text-secondary">
              Pick 3 to 5 values
            </p>
            <button
              onClick={goToRanking}
              disabled={selected.size < 3}
              className="w-full rounded-xl bg-accent py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:bg-gray-300 disabled:text-gray-500"
            >
              Continue
            </button>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-text-secondary">
              Drag or use arrows to rank. #1 is your top priority.
            </p>
            <div className="mb-6 space-y-2" role="listbox" aria-label="Value priority ranking">
              {ranked.map((item, index) => (
                <div
                  key={item.category}
                  className="flex items-center gap-3 rounded-xl bg-bg-primary px-4 py-3"
                  role="option"
                  aria-selected={true}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-[14px] font-medium">{item.name}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveItem(index, -1)}
                      disabled={index === 0}
                      className="rounded p-1 text-text-secondary hover:text-text-primary disabled:opacity-30"
                      aria-label={`Move ${item.name} up`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveItem(index, 1)}
                      disabled={index === ranked.length - 1}
                      className="rounded p-1 text-text-secondary hover:text-text-primary disabled:opacity-30"
                      aria-label={`Move ${item.name} down`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {error && (
              <div className="mb-4 rounded-xl p-3 text-sm" style={{ backgroundColor: "var(--color-gap-bg)", color: "var(--color-gap-text)" }}>
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-[15px] font-medium text-text-secondary"
              >
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-xl bg-accent py-3 text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save values"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
