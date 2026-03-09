import { InMemoryEventBus } from '../../../../packages/event-bus/src';
import { DomainEvent } from '@port-to-shelf/shared-types';
import { ULIPIntegrationService } from '../service';

describe('Task 25 Checkpoint - ULIP integration complete', () => {
  test('all ULIP integrations work end-to-end', async () => {
    const seenUrls: string[] = [];

    const service = new ULIPIntegrationService(
      {
        clientId: 'checkpoint-client',
        clientSecret: 'checkpoint-secret',
        tokenEndpoint: 'https://ulip.example/token',
        defaultScope: ['events:write'],
      },
      {
        post: async (url: string) => {
          seenUrls.push(url);

          if (url.includes('/token')) {
            return { accessToken: 'checkpoint-token', tokenType: 'Bearer', expiresIn: 3600, scope: ['events:write'] };
          }
          if (url.includes('/ports/query')) {
            return { name: 'Mumbai', availableBerths: 3 };
          }
          if (url.includes('/rail/capacity')) {
            return { availableWagons: 5, capacity: 10, transitTime: 20, cost: 1000 };
          }
          if (url.includes('/rail/bookings')) {
            return { bookingId: 'RAIL-CHK-1', cost: 1000 };
          }
          if (url.includes('/road/availability')) {
            return { fleetProviders: [{ id: 'FP-1', name: 'Road Fleet', availableCapacity: 20, ratePerKm: 40 }], availableTrucks: 2 };
          }
          if (url.includes('/road/bookings')) {
            return { bookingId: 'ROAD-CHK-1', truckId: 'TRUCK-CHK-1', cost: 3200 };
          }
          if (url.includes('/customs/status')) {
            return { status: 'PENDING', holds: [], documentsRequired: ['BOE'] };
          }
          if (url.includes('/customs/documents')) {
            return { ok: true };
          }
          if (url.includes('/analytics/dashboard')) {
            return { region: 'IN', benchmarkScore: 90 };
          }
          if (url.includes('/analytics/metrics')) {
            return { ok: true };
          }
          if (url.includes('/analytics/contribute')) {
            return { ok: true };
          }
          if (url.includes('/events')) {
            return { ok: true };
          }

          return { ok: true };
        },
      }
    );

    const bus = new InMemoryEventBus();
    const consumed: string[] = [];
    service.subscribeToEvents(bus, async (event) => consumed.push(event.eventId));

    await service.authenticate();
    await service.queryPortData('INMUM');
    await service.createRailBooking({
      containerId: 'ABCD1234567',
      route: { origin: 'INMUM', destination: 'INCCU' },
      departureDate: new Date('2026-09-01T00:00:00.000Z'),
      capacity: 2,
    });

    await service.createTruckBooking({
      containerId: 'EFGH1234567',
      pickupLocation: 'INMUM',
      deliveryLocation: 'INDEL',
      pickupDate: new Date('2026-09-02T00:00:00.000Z'),
      fleetProviderId: 'FP-1',
    });

    await service.getCustomsStatus('IJKL1234567');
    await service.submitCustomsDocuments('IJKL1234567', [{ type: 'BOE', content: 'doc', format: 'PDF' }]);

    await service.publishPerformanceMetrics({ transitTimeHours: 18, demurrageCost: 0, slotUtilization: 0.8 });
    await service.includeULIPDataInReport({ reportId: 'R1' });
    await service.contributeAnonymizedOperationalData({ retailerId: 'RET-1', transitTimeHours: 18 });

    await service.publishEvent({
      eventId: 'ulip-checkpoint-event',
      eventType: 'ulip.event.received',
      timestamp: new Date('2026-09-03T00:00:00.000Z'),
      source: 'ulip-integration',
      data: { ok: true },
      metadata: {},
    });

    const inbound: DomainEvent = {
      eventId: 'checkpoint-inbound-1',
      eventType: 'road.transport.updated' as any,
      timestamp: new Date('2026-09-03T01:00:00.000Z'),
      source: 'road-service',
      version: 1,
      payload: { truckId: 'TRUCK-CHK-1' },
    };
    await bus.publish(inbound);

    expect(consumed).toContain('checkpoint-inbound-1');
    expect(seenUrls.some((u) => u.includes('/ports/query'))).toBe(true);
    expect(seenUrls.some((u) => u.includes('/rail/bookings'))).toBe(true);
    expect(seenUrls.some((u) => u.includes('/road/bookings'))).toBe(true);
    expect(seenUrls.some((u) => u.includes('/customs/status'))).toBe(true);
    expect(seenUrls.some((u) => u.includes('/analytics/dashboard'))).toBe(true);
    expect(seenUrls.some((u) => u.includes('/events'))).toBe(true);
  });

  test('ULIP data standards validators are enforced', () => {
    const service = new ULIPIntegrationService(
      {
        clientId: 'checkpoint-client',
        clientSecret: 'checkpoint-secret',
        tokenEndpoint: 'https://ulip.example/token',
        defaultScope: ['events:write'],
      },
      {
        post: async () => ({ accessToken: 'checkpoint-token', tokenType: 'Bearer', expiresIn: 3600, scope: ['events:write'] }),
      }
    );

    expect(service.validateISO6346ContainerId('ABCD1234567')).toBe(true);
    expect(service.validateUNLocode('INMUM')).toBe(true);
    expect(service.formatTimestampIST(new Date('2026-01-01T00:00:00.000Z')).endsWith('+05:30')).toBe(true);
    expect(service.validateULIPEventTaxonomy('container.mode.changed')).toBe(true);

    const roundTripOk = service.validateULIPJSONSchemaRoundTrip({
      eventId: 'schema-roundtrip-1',
      eventType: 'ulip.event.received',
      timestamp: new Date('2026-01-01T00:00:00.000Z'),
      source: 'ulip',
      data: { key: 'value' },
      metadata: { location: 'INMUM' },
    });

    expect(roundTripOk).toBe(true);
  });
});
