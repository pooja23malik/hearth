import { EventEmitter } from "events";

// Module-level singleton — shared across all API route handlers
const emitter = new EventEmitter();
emitter.setMaxListeners(100); // Support many concurrent SSE connections

type Connection = {
  memberId: string;
  writer: WritableStreamDefaultWriter<Uint8Array>;
};

// Map of boardId → connected clients
const connections = new Map<string, Connection[]>();

const encoder = new TextEncoder();

export function subscribe(
  boardId: string,
  memberId: string,
  writer: WritableStreamDefaultWriter<Uint8Array>
) {
  if (!connections.has(boardId)) {
    connections.set(boardId, []);
  }
  connections.get(boardId)!.push({ memberId, writer });
}

export function unsubscribe(
  boardId: string,
  memberId: string,
  writer: WritableStreamDefaultWriter<Uint8Array>
) {
  const conns = connections.get(boardId);
  if (!conns) return;

  const idx = conns.findIndex(
    (c) => c.memberId === memberId && c.writer === writer
  );
  if (idx !== -1) conns.splice(idx, 1);
  if (conns.length === 0) connections.delete(boardId);
}

/**
 * Broadcast an event to all connected clients on a board.
 * If personalMemberId is provided, only send to that member (for personal tasks).
 */
export function broadcast(
  boardId: string,
  event: string,
  data: unknown,
  personalMemberId?: string
) {
  const conns = connections.get(boardId);
  if (!conns) return;

  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoded = encoder.encode(message);

  for (const conn of conns) {
    if (personalMemberId && conn.memberId !== personalMemberId) {
      continue; // Skip non-owner for personal task events
    }
    conn.writer.write(encoded).catch(() => {
      // Connection closed — will be cleaned up by unsubscribe
    });
  }
}

export { emitter };
