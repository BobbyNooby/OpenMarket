import { PUBLIC_API_URL } from '$env/static/public';
import { toast } from 'svelte-sonner';

type WsMessageOut =
	| {
			type: 'new_message';
			data: {
				id: string;
				conversation_id: string;
				sender_id: string;
				content: string;
				created_at: string;
				edited_at: string | null;
				is_deleted: boolean;
				sender: {
					user_id: string;
					username: string;
					display_name: string;
					avatar: string | null;
				};
			};
	  }
	| { type: 'typing'; data: { conversation_id: string; user_id: string } }
	| { type: 'stop_typing'; data: { conversation_id: string; user_id: string } }
	| { type: 'message_deleted'; data: { message_id: string; conversation_id: string } }
	| {
			type: 'notification';
			data: {
				id: string;
				type: string;
				title: string;
				body: string | null;
				link: string | null;
				is_read: boolean;
				created_at: string;
			};
	  }
	| { type: 'pong' }
	| { type: 'new_listing'; data: Record<string, unknown> };

type EventCallback = (data: unknown) => void;

class WsManager {
	connected = $state(false);
	totalUnread = $state(0);
	typingUsers = $state<Map<string, Set<string>>>(new Map());

	private ws: WebSocket | null = null;
	private reconnectAttempts = 0;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
	private listeners = new Map<string, Set<EventCallback>>();
	private shouldReconnect = false;
	private typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

	async connect(): Promise<void> {
		if (this.ws?.readyState === WebSocket.OPEN) return;

		this.shouldReconnect = true;

		try {
			const res = await fetch(`${PUBLIC_API_URL}/api/ws/ticket`, {
				method: 'POST',
				credentials: 'include'
			});
			const json = await res.json();
			if (!json.success || !json.ticket) return;

			const wsUrl = PUBLIC_API_URL.replace(/^http/, 'ws');
			this.ws = new WebSocket(`${wsUrl}/ws/chat?ticket=${json.ticket}`);

			this.ws.onopen = () => {
				this.connected = true;
				this.reconnectAttempts = 0;
				this.startHeartbeat();
			};

			this.ws.onmessage = (event) => {
				this.handleMessage(event);
			};

			this.ws.onclose = () => {
				this.connected = false;
				this.stopHeartbeat();
				if (this.shouldReconnect) this.reconnect();
			};

			this.ws.onerror = () => {
				// onclose will fire after this
			};
		} catch {
			if (this.shouldReconnect) this.reconnect();
		}
	}

	disconnect(): void {
		this.shouldReconnect = false;
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		this.stopHeartbeat();
		this.ws?.close();
		this.ws = null;
		this.connected = false;
	}

	on(event: string, callback: EventCallback): () => void {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}
		this.listeners.get(event)!.add(callback);
		return () => {
			this.listeners.get(event)?.delete(callback);
		};
	}

	sendTyping(conversationId: string): void {
		this.wsSend({ type: 'typing', data: { conversation_id: conversationId } });
	}

	sendStopTyping(conversationId: string): void {
		this.wsSend({ type: 'stop_typing', data: { conversation_id: conversationId } });
	}

	// Conversation currently being viewed — messages here don't bump unread
	activeConversationId = $state<string | null>(null);

	updateUnreadCount(count: number): void {
		this.totalUnread = count;
	}

	private wsSend(data: object): void {
		if (this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(data));
		}
	}

	private handleMessage(event: MessageEvent): void {
		let msg: WsMessageOut;
		try {
			msg = JSON.parse(event.data);
		} catch {
			return;
		}

		if (msg.type === 'pong') return;

		// Handle notification events — show toast and update notification store
		if (msg.type === 'notification') {
			// Dynamically import to avoid circular dependency
			import('$lib/stores/notifications.svelte').then(({ notificationManager }) => {
				notificationManager.addFromWebSocket(msg.data);
			});

			toast(msg.data.title, {
				description: msg.data.body ?? undefined,
				action: msg.data.link
					? {
							label: 'View',
							onClick: () => {
								window.location.href = msg.data.link!;
							}
						}
					: undefined,
				duration: 5000,
			});
			return;
		}

		// Bump unread count for messages not in the active conversation
		if (msg.type === 'new_message' && msg.data.conversation_id !== this.activeConversationId) {
			this.totalUnread++;
		}

		if (msg.type === 'typing') {
			const convId = msg.data.conversation_id;
			const userId = msg.data.user_id;
			const current = new Map(this.typingUsers);
			if (!current.has(convId)) current.set(convId, new Set());
			current.get(convId)!.add(userId);
			this.typingUsers = current;

			// Auto-clear after 4s
			const key = `${convId}:${userId}`;
			if (this.typingTimers.has(key)) clearTimeout(this.typingTimers.get(key)!);
			this.typingTimers.set(
				key,
				setTimeout(() => {
					const updated = new Map(this.typingUsers);
					updated.get(convId)?.delete(userId);
					if (updated.get(convId)?.size === 0) updated.delete(convId);
					this.typingUsers = updated;
					this.typingTimers.delete(key);
				}, 4000)
			);
		}

		if (msg.type === 'stop_typing') {
			const convId = msg.data.conversation_id;
			const userId = msg.data.user_id;
			const current = new Map(this.typingUsers);
			current.get(convId)?.delete(userId);
			if (current.get(convId)?.size === 0) current.delete(convId);
			this.typingUsers = current;

			const key = `${convId}:${userId}`;
			if (this.typingTimers.has(key)) {
				clearTimeout(this.typingTimers.get(key)!);
				this.typingTimers.delete(key);
			}
		}

		// Dispatch to listeners
		const callbacks = this.listeners.get(msg.type);
		if (callbacks) {
			for (const cb of callbacks) {
				cb('data' in msg ? msg.data : undefined);
			}
		}
	}

	private reconnect(): void {
		if (!this.shouldReconnect) return;
		const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
		this.reconnectAttempts++;
		this.reconnectTimer = setTimeout(() => {
			this.connect();
		}, delay);
	}

	private startHeartbeat(): void {
		this.stopHeartbeat();
		this.heartbeatTimer = setInterval(() => {
			this.wsSend({ type: 'ping' });
		}, 30000);
	}

	private stopHeartbeat(): void {
		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer);
			this.heartbeatTimer = null;
		}
	}
}

export const wsManager = new WsManager();
