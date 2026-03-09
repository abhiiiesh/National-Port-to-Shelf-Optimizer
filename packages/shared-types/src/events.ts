export const DOMAIN_EVENT_TYPES = [
  'vessel.position.updated',
  'vessel.arrived',
  'container.mode.changed',
  'container.delivered',
  'demurrage.alert',
  'auction.created',
  'auction.bid.placed',
  'slot.reserved',
  'ulip.event.received',
] as const;

export type DomainEventType = (typeof DOMAIN_EVENT_TYPES)[number];

export interface DomainEvent<TPayload = Record<string, unknown>> {
  eventId: string;
  eventType: DomainEventType;
  timestamp: Date;
  source: string;
  version: number;
  payload: TPayload;
  metadata?: Record<string, string>;
}

export function serializeEvent<TPayload>(event: DomainEvent<TPayload>): string {
  return JSON.stringify({
    ...event,
    timestamp: event.timestamp.toISOString(),
  });
}

export function deserializeEvent<TPayload = Record<string, unknown>>(serialized: string): DomainEvent<TPayload> {
  const parsed = JSON.parse(serialized) as Omit<DomainEvent<TPayload>, 'timestamp'> & { timestamp: string };

  if (!parsed.eventId || !parsed.eventType || !parsed.timestamp || !parsed.source) {
    throw new Error('Invalid event payload');
  }

  return {
    ...parsed,
    timestamp: new Date(parsed.timestamp),
  };
}
