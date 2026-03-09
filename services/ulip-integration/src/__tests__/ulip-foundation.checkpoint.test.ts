import { InMemoryEventBus } from '../../../../packages/event-bus/src';
import { DomainEvent } from '@port-to-shelf/shared-types';
import { ULIPIntegrationService } from '../service';

describe('Task 20 Checkpoint - ULIP integration foundation', () => {
  test('ULIP authentication works and service reports healthy state', async () => {
    let tokenCalls = 0;
    const service = new ULIPIntegrationService(
      {
        clientId: 'checkpoint-client',
        clientSecret: 'checkpoint-secret',
        tokenEndpoint: 'https://ulip.example/token',
        defaultScope: ['events:write'],
      },
      {
        post: async (url: string) => {
          if (url.includes('/token')) {
            tokenCalls += 1;
            return { accessToken: 'checkpoint-token', tokenType: 'Bearer', expiresIn: 3600, scope: ['events:write'] };
          }
          return { ok: true };
        },
      }
    );

    const token = await service.authenticate();

    expect(token.accessToken).toBe('checkpoint-token');
    expect(token.tokenType).toBe('Bearer');
    expect(tokenCalls).toBe(1);
    expect(service.isHealthy()).toBe(true);
  });

  test('ULIP event publishing and subscription pipeline works', async () => {
    const httpCalls: string[] = [];
    const received: string[] = [];

    const service = new ULIPIntegrationService(
      {
        clientId: 'checkpoint-client',
        clientSecret: 'checkpoint-secret',
        tokenEndpoint: 'https://ulip.example/token',
        defaultScope: ['events:write'],
      },
      {
        post: async (url: string) => {
          httpCalls.push(url);
          if (url.includes('/token')) {
            return { accessToken: 'checkpoint-token', tokenType: 'Bearer', expiresIn: 3600, scope: ['events:write'] };
          }
          return { ok: true };
        },
      }
    );

    const bus = new InMemoryEventBus();
    service.subscribeToEvents(bus, async (event) => {
      received.push(event.eventId);
    });

    await service.publishEvent({
      eventId: 'checkpoint-publish-1',
      eventType: 'ulip.event.received',
      timestamp: new Date('2026-03-01T00:00:00.000Z'),
      source: 'ulip-integration',
      data: { containerId: 'C-1' },
      metadata: { containerId: 'C-1' },
    });

    const inbound: DomainEvent = {
      eventId: 'checkpoint-sub-1',
      eventType: 'port.operation.updated' as any,
      timestamp: new Date('2026-03-01T01:00:00.000Z'),
      source: 'port-service',
      version: 1,
      payload: { portId: 'INMUM' },
    };

    await bus.publish(inbound);

    expect(httpCalls.some((url) => url.includes('/events'))).toBe(true);
    expect(received).toEqual(['checkpoint-sub-1']);
  });
});
