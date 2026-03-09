import { DOMAIN_EVENT_TYPES, deserializeEvent, DomainEvent, serializeEvent } from '@port-to-shelf/shared-types';
import { EventSchemaRegistry, InMemoryEventBus } from '../index';

function createEvent(overrides: Partial<DomainEvent> = {}): DomainEvent {
  return {
    eventId: overrides.eventId || 'evt-1',
    eventType: overrides.eventType || 'vessel.position.updated',
    timestamp: overrides.timestamp || new Date('2026-01-01T00:00:00.000Z'),
    source: overrides.source || 'vessel-tracking',
    version: overrides.version ?? 1,
    payload: overrides.payload || { lat: 1, lon: 2 },
    metadata: overrides.metadata,
  };
}

describe('Event Bus (Task 6)', () => {
  test('publishes events to configured topics', async () => {
    const bus = new InMemoryEventBus();
    bus.configureTopics(DOMAIN_EVENT_TYPES);

    const published = await bus.publish(createEvent());

    expect(published).toBe(true);
    const stored = bus.getEvents('vessel.position.updated');
    expect(stored).toHaveLength(1);
    expect(stored[0].eventId).toBe('evt-1');
  });

  test('subscribes with consumer groups and dispatches one handler per group', async () => {
    const bus = new InMemoryEventBus();
    const calls: string[] = [];

    bus.subscribe('vessel.position.updated', 'group-a', async () => {
      calls.push('a1');
    });
    bus.subscribe('vessel.position.updated', 'group-a', async () => {
      calls.push('a2');
    });
    bus.subscribe('vessel.position.updated', 'group-b', async () => {
      calls.push('b1');
    });

    await bus.publish(createEvent({ eventId: 'evt-2' }));

    expect(calls).toHaveLength(2);
    expect(calls.includes('b1')).toBe(true);
    expect(calls.some((entry) => entry.startsWith('a'))).toBe(true);
  });

  test('enforces idempotency for duplicate event IDs', async () => {
    const bus = new InMemoryEventBus();
    const first = await bus.publish(createEvent({ eventId: 'evt-3' }));
    const duplicate = await bus.publish(createEvent({ eventId: 'evt-3', payload: { lat: 5 } }));

    expect(first).toBe(true);
    expect(duplicate).toBe(false);
    expect(bus.getEvents('vessel.position.updated')).toHaveLength(1);
  });

  test('supports schema registry validation', async () => {
    const registry = new EventSchemaRegistry();
    registry.register({
      eventType: 'container.mode.changed',
      version: 1,
      validate: (payload) => Boolean(payload && typeof (payload as { from?: unknown }).from === 'string'),
    });

    const bus = new InMemoryEventBus(registry);
    await expect(
      bus.publish(
        createEvent({
          eventId: 'evt-4',
          eventType: 'container.mode.changed',
          payload: { invalid: true },
        })
      )
    ).rejects.toThrow('Schema validation failed');
  });

  test('serializes and deserializes event payloads', () => {
    const event = createEvent({ eventId: 'evt-5', eventType: 'demurrage.alert' });

    const serialized = serializeEvent(event);
    const deserialized = deserializeEvent(serialized);

    expect(deserialized.eventId).toBe(event.eventId);
    expect(deserialized.eventType).toBe(event.eventType);
    expect(deserialized.timestamp.toISOString()).toBe(event.timestamp.toISOString());
  });
});
