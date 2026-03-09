import { db } from '../db/db';
import { auditLogsTable } from '../db/rbac-schema';

export async function logAuditEvent(
	actorId: string,
	action: string,
	targetType: string,
	targetId: string,
	metadata?: Record<string, unknown>
) {
	await db.insert(auditLogsTable).values({
		actorId,
		action,
		targetType,
		targetId,
		metadata: metadata ?? null,
	});
}
