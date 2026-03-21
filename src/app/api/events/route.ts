import { NextRequest } from "next/server";
import { subscribe, unsubscribe } from "@/lib/sse";

export const runtime = "nodejs";

// GET /api/events — SSE endpoint for real-time updates
export async function GET(request: NextRequest) {
  const boardId = request.cookies.get("boardId")?.value;
  const memberId = request.cookies.get("memberId")?.value;

  if (!boardId || !memberId) {
    return new Response("Not authenticated", { status: 401 });
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Register this connection
  subscribe(boardId, memberId, writer);

  // Send initial connection confirmation
  writer.write(encoder.encode("event: connected\ndata: {}\n\n"));

  // Keep-alive heartbeat every 15 seconds
  const heartbeat = setInterval(() => {
    writer.write(encoder.encode(": ping\n\n")).catch(() => {
      clearInterval(heartbeat);
    });
  }, 15000);

  // Clean up on disconnect
  request.signal.addEventListener("abort", () => {
    clearInterval(heartbeat);
    unsubscribe(boardId, memberId, writer);
    writer.close().catch(() => {});
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
