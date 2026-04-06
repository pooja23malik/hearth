"use client";

type Props = {
  text: string;
};

export default function GapCallout({ text }: Props) {
  return (
    <div
      className="rounded-xl p-3.5 my-4"
      style={{
        backgroundColor: "var(--color-gap-bg)",
        border: "1px solid var(--color-gap-border)",
      }}
      role="alert"
    >
      <p
        className="text-[14px] leading-relaxed"
        style={{ color: "var(--color-gap-text)" }}
      >
        {text}
      </p>
    </div>
  );
}
