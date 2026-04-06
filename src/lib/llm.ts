const LLM_ENDPOINT = process.env.LLM_ENDPOINT || "http://localhost:11434";
const LLM_MODEL = process.env.LLM_MODEL || "gemma3";
const TIMEOUT_MS = 10_000;

export async function generateInsight(
  systemPrompt: string,
  userPrompt: string
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(`${LLM_ENDPOINT}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: LLM_MODEL,
        system: systemPrompt,
        prompt: userPrompt,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`LLM request failed with status ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.response ?? null;
  } catch (error) {
    console.error("LLM generation error:", error);
    return null;
  }
}
