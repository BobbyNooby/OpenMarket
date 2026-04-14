import type { WsMessageOut } from "./types";

// Minimal interface for WebSocket — works with both Elysia WS wrapper and raw ServerWebSocket
interface WsLike {
  send(data: string | ArrayBuffer | Uint8Array): void;
}

interface Ticket {
  userId: string;
  expiresAt: number;
}

const ticketMap = new Map<string, Ticket>();
const connections = new Map<string, Set<WsLike>>();

// Clean up expired tickets every 60s
setInterval(() => {
  const now = Date.now();
  for (const [token, ticket] of ticketMap) {
    if (ticket.expiresAt < now) ticketMap.delete(token);
  }
}, 60_000);

export function createTicket(userId: string): string {
  const token = crypto.randomUUID();
  ticketMap.set(token, { userId, expiresAt: Date.now() + 30_000 });
  return token;
}

export function validateTicket(token: string): string | null {
  const ticket = ticketMap.get(token);
  if (!ticket) return null;
  ticketMap.delete(token);
  if (ticket.expiresAt < Date.now()) return null;
  return ticket.userId;
}

export function addConnection(
  userId: string,
  ws: WsLike,
): void {
  let set = connections.get(userId);
  if (!set) {
    set = new Set();
    connections.set(userId, set);
  }
  set.add(ws);
}

export function removeConnection(
  userId: string,
  ws: WsLike,
): void {
  const set = connections.get(userId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) connections.delete(userId);
}

export function sendToUser(userId: string, message: WsMessageOut): void {
  const set = connections.get(userId);
  if (!set) return;
  const payload = JSON.stringify(message);
  for (const ws of set) {
    try {
      ws.send(payload);
    } catch {
      // Connection is dead, will be cleaned up on close
    }
  }
}

export function broadcast(userIds: string[], message: WsMessageOut): void {
  for (const userId of userIds) {
    sendToUser(userId, message);
  }
}

export function isUserConnected(userId: string): boolean {
  const set = connections.get(userId);
  return !!set && set.size > 0;
}

// Send a message to ALL connected users
export function broadcastAll(message: WsMessageOut): void {
  const payload = JSON.stringify(message);
  for (const [, set] of connections) {
    for (const ws of set) {
      try { ws.send(payload); } catch {}
    }
  }
}
