import { db } from '../lib/db'

export type EventType =
  | 'USER_REGISTERED'
  | 'USER_LOGGED_IN'
  | 'ACCOUNT_CREATED'
  | 'TRANSFER_INITIATED'
  | 'TRANSFER_COMPLETED'
  | 'TRANSFER_FAILED'
  | 'TRANSFER_INSUFFICIENT_FUNDS'
  | 'TRANSFER_SELF_BLOCKED'
  | 'TRANSFER_SAME_ACCOUNT_BLOCKED'
  | 'IDEMPOTENCY_HIT'

export interface AuditEvent {
  eventType: EventType
  userId?: string
  metadata?: Record<string, unknown>
}

export const logEvent = async (event: AuditEvent): Promise<void> => {
  try {
    await db.auditEvent.create({
      data: {
        eventType: event.eventType,
        userId: event.userId || null,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      },
    })
  } catch {
    // Audit logging should never crash the request
    // In production, send to a logging service
  }
}

export const getRecentEvents = async (limit = 50) => {
  return db.auditEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export const getEventCounts = async (hours = 24) => {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000)
  return db.auditEvent.groupBy({
    by: ['eventType'],
    where: { createdAt: { gte: since } },
    _count: true,
  })
}
