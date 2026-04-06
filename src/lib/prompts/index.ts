import fs from "fs";
import path from "path";

const cache = new Map<string, string>();

export function loadPrompt(name: string): string {
  const cached = cache.get(name);
  if (cached) return cached;

  const filePath = path.join(__dirname, `${name}.txt`);
  const content = fs.readFileSync(filePath, "utf-8");
  cache.set(name, content);
  return content;
}
