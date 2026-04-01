import { PUBLIC_API_URL } from '$env/static/public';

export interface Notification {
	id: string;
	type: string;
	title: string;
	body: string | null;
	link: string | null;
	is_read: boolean;
	created_at: string;
}

class NotificationManager {
	notifications = $state<Notification[]>([]);
	unreadCount = $state(0);
	loading = $state(false);

	async fetch(): Promise<void> {
		this.loading = true;
		try {
			const res = await fetch(`${PUBLIC_API_URL}/notifications?limit=10`, {
				credentials: 'include'
			});
			const json = await res.json();
			if (json.success) {
				this.notifications = json.data;
				this.unreadCount = json.unread_count;
			}
		} catch {
			// silently fail
		} finally {
			this.loading = false;
		}
	}

	async markAsRead(id: string): Promise<void> {
		const notification = this.notifications.find((n) => n.id === id);
		if (notification && !notification.is_read) {
			notification.is_read = true;
			this.unreadCount = Math.max(0, this.unreadCount - 1);

			await fetch(`${PUBLIC_API_URL}/notifications/${id}/read`, {
				method: 'PATCH',
				credentials: 'include'
			});
		}
	}

	async markAllAsRead(): Promise<void> {
		this.notifications = this.notifications.map((n) => ({ ...n, is_read: true }));
		this.unreadCount = 0;

		await fetch(`${PUBLIC_API_URL}/notifications/read-all`, {
			method: 'POST',
			credentials: 'include'
		});
	}

	addFromWebSocket(notification: Notification): void {
		this.notifications = [notification, ...this.notifications].slice(0, 10);
		this.unreadCount++;
	}
}

export const notificationManager = new NotificationManager();
