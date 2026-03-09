import fc from 'fast-check';
import { InMemoryEventBus } from '../../../../packages/event-bus/src';
import { ULIPIntegrationService } from '../service';

function createService(postImpl?: (url: string, body: unknown) => Promise<any>) {
  return new ULIPIntegrationService(
    {
      clientId: 'cid',
      clientSecret: 'sec',
      tokenEndpoint: 'https://ulip.example/token',
      defaultScope: ['events:write'],
    },
    {
      post: async (url: string, body: unknown) => {
        if (postImpl) return postImpl(url, body);
        if (url.includes('/token')) {
          return { accessToken: 'tok', tokenType: 'Bearer', expiresIn: 3600, scope: ['events:write'] };
        }
        return { ok: true };
      },
    }
  );
}

describe('ULIP Integration properties (Task 17)', () => {
  test('Property 47: OAuth 2.0 ULIP Authentication', async () => {
    await fc.assert(
      fc.asyncProperty(fc.boolean(), async (refresh) => {
        const service = createService();
        const token = await service.authenticate(refresh);
        expect(token.accessToken.length).toBeGreaterThan(0);
        expect(token.tokenType).toBe('Bearer');
      })
    );
  });

  test('Property 48: ULIP Data Format Compliance', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), fc.string({ minLength: 3 }), async (id, eventType) => {
        const service = createService();
        await expect(
          service.publishEvent({
            eventId: id,
            eventType,
            timestamp: new Date(),
            source: 'svc',
            data: { ok: true },
            metadata: {},
          })
        ).resolves.toBeUndefined();
      })
    );
  });

  test('Property 49: Rate Limit Backoff', async () => {
    let calls = 0;
    const service = createService(async (url) => {
      if (url.includes('/token')) {
        return { accessToken: 'tok', tokenType: 'Bearer', expiresIn: 3600, scope: ['events:write'] };
      }
      calls += 1;
      if (calls < 3) throw new Error('429');
      return { ok: true };
    });

    await service.publishEvent({
      eventId: 'evt-backoff',
      eventType: 'container.updated',
      timestamp: new Date(),
      source: 'svc',
      data: {},
      metadata: {},
    });

    expect(calls).toBe(3);
  });

  test('Property 50: ULIP Connection Resilience', async () => {
    const service = createService();
    await service.authenticate();
    expect(service.isHealthy()).toBe(true);
  });

  test('Property 51: Container Event Publishing to ULIP', async () => {
    const service = createService();
    await expect(
      service.publishEvent({
        eventId: 'evt-c',
        eventType: 'container.delivered',
        timestamp: new Date(),
        source: 'container-tracking',
        data: { containerId: 'C1' },
        metadata: { containerId: 'C1' },
      })
    ).resolves.toBeUndefined();
  });

  test('Property 52: Vessel Data Synchronization to ULIP', async () => {
    const service = createService();
    await expect(
      service.publishEvent({
        eventId: 'evt-v',
        eventType: 'vessel.position.updated',
        timestamp: new Date(),
        source: 'vessel-tracking',
        data: { vesselId: 'V1' },
        metadata: { vesselId: 'V1' },
      })
    ).resolves.toBeUndefined();
  });

  test('Property 53: ULIP Event Data Validation', async () => {
    const service = createService();
    await expect(
      service.publishEvent({
        eventId: '',
        eventType: 'bad',
        timestamp: new Date(),
        source: 'svc',
        data: {},
        metadata: {},
      })
    ).rejects.toThrow('Invalid ULIP event format');
  });

  test('Property 54: Timestamp-Based Conflict Resolution', async () => {
    const service = createService();
    const bus = new InMemoryEventBus();
    const received: Date[] = [];

    service.subscribeToEvents(bus, async (event) => {
      received.push(event.timestamp);
    });

    await bus.publish({
      eventId: 'same',
      eventType: 'port.operation.updated',
      timestamp: new Date('2026-01-02T00:00:00.000Z'),
      source: 'ulip',
      version: 1,
      payload: {},
    });
    await bus.publish({
      eventId: 'same',
      eventType: 'port.operation.updated',
      timestamp: new Date('2026-01-01T00:00:00.000Z'),
      source: 'ulip',
      version: 1,
      payload: {},
    });

    expect(received).toHaveLength(1);
  });
});
