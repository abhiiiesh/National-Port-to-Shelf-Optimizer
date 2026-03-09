import { createGateway } from '../index';
import { InMemoryEventBus } from '../../../../packages/event-bus/src';
import { DomainEvent } from '@port-to-shelf/shared-types';

describe('Task 7 Checkpoint - Core infrastructure', () => {
  test('authentication works end-to-end through gateway protection', async () => {
    const proxyCalls: Array<{ target: string; path: string }> = [];
    const gateway = createGateway(
      {},
      async (token) => ({ valid: token === 'valid-token', userId: 'u-1', roles: ['PORT_OPERATOR'] as any }),
      async (target, req) => {
        proxyCalls.push({ target, path: req.path });
        return {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ok: true }),
        };
      }
    );

    const unauthorized = await gateway.handle({
      method: 'GET',
      path: '/api/v1/vessels',
      ip: '127.0.0.10',
      headers: {},
    });
    expect(unauthorized.status).toBe(401);

    const authorized = await gateway.handle({
      method: 'GET',
      path: '/api/v1/vessels/IMO-12345',
      ip: '127.0.0.10',
      headers: { authorization: 'Bearer valid-token' },
    });

    expect(authorized.status).toBe(200);
    expect(proxyCalls).toHaveLength(1);
    expect(proxyCalls[0]).toEqual({
      target: 'http://localhost:3001',
      path: '/IMO-12345',
    });
  });

  test('event bus publishes and consumers receive events', async () => {
    const bus = new InMemoryEventBus();
    const consumed: string[] = [];

    bus.subscribe('container.mode.changed', 'checkpoint-consumer-group', async (event) => {
      consumed.push(event.eventId);
    });

    const event: DomainEvent<{ fromMode: string; toMode: string }> = {
      eventId: 'checkpoint-evt-1',
      eventType: 'container.mode.changed',
      timestamp: new Date('2026-01-02T00:00:00.000Z'),
      source: 'container-tracking',
      version: 1,
      payload: { fromMode: 'VESSEL', toMode: 'RAIL' },
    };

    const published = await bus.publish(event);

    expect(published).toBe(true);
    expect(consumed).toEqual(['checkpoint-evt-1']);
  });
});
