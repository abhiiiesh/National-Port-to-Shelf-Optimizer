import { ULIPIntegrationService } from '../service';

describe('ULIPIntegrationService edge cases (Task 17.12)', () => {
  test('authentication failure bubbles error', async () => {
    const service = new ULIPIntegrationService(
      { clientId: 'a', clientSecret: 'b', tokenEndpoint: 'https://ulip/token', defaultScope: ['x'] },
      { post: async () => { throw new Error('auth failed'); } }
    );

    await expect(service.authenticate()).rejects.toThrow('auth failed');
  });

  test('token expiration triggers refresh logic', async () => {
    let tokenCalls = 0;
    const service = new ULIPIntegrationService(
      { clientId: 'a', clientSecret: 'b', tokenEndpoint: 'https://ulip/token', defaultScope: ['x'] },
      {
        post: async (url: string) => {
          if (url.includes('/token')) {
            tokenCalls += 1;
            return { accessToken: `tok-${tokenCalls}`, tokenType: 'Bearer', expiresIn: 0, scope: ['x'] };
          }
          return { ok: true };
        },
      }
    );

    const t1 = await service.authenticate();
    const t2 = await service.authenticate();
    expect(t1.accessToken).not.toBe(t2.accessToken);
  });

  test('rate limit response handling retries then succeeds', async () => {
    let eventCalls = 0;
    const service = new ULIPIntegrationService(
      { clientId: 'a', clientSecret: 'b', tokenEndpoint: 'https://ulip/token', defaultScope: ['x'] },
      {
        post: async (url: string) => {
          if (url.includes('/token')) {
            return { accessToken: 'tok', tokenType: 'Bearer', expiresIn: 3600, scope: ['x'] };
          }
          eventCalls += 1;
          if (eventCalls <= 2) throw new Error('429 rate limit');
          return { ok: true };
        },
      }
    );

    await service.publishEvent({
      eventId: 'evt',
      eventType: 'container.updated',
      timestamp: new Date(),
      source: 'svc',
      data: {},
      metadata: {},
    });

    expect(eventCalls).toBe(3);
  });

  test('circuit breaker opens after repeated failures', async () => {
    const service = new ULIPIntegrationService(
      { clientId: 'a', clientSecret: 'b', tokenEndpoint: 'https://ulip/token', defaultScope: ['x'] },
      {
        post: async (url: string) => {
          if (url.includes('/token')) {
            return { accessToken: 'tok', tokenType: 'Bearer', expiresIn: 3600, scope: ['x'] };
          }
          throw new Error('always fail');
        },
      },
      { maxRetries: 0, initialBackoffMs: 1, maxBackoffMs: 1, circuitBreakerThreshold: 1, publishTimeoutMs: 1000 }
    );

    await expect(
      service.publishEvent({ eventId: 'evt1', eventType: 'x', timestamp: new Date(), source: 'svc', data: {}, metadata: {} })
    ).rejects.toThrow('always fail');

    await expect(
      service.publishEvent({ eventId: 'evt2', eventType: 'x', timestamp: new Date(), source: 'svc', data: {}, metadata: {} })
    ).rejects.toThrow('Circuit breaker is open');
  });


  test('berthing notification with missing data is rejected', () => {
    const service = new ULIPIntegrationService(
      { clientId: 'a', clientSecret: 'b', tokenEndpoint: 'https://ulip/token', defaultScope: ['x'] },
      { post: async () => ({ accessToken: 'tok', tokenType: 'Bearer', expiresIn: 3600, scope: ['x'] }) }
    );

    expect(() => service.processBerthingNotification({
      eventId: 'b1', eventType: 'berthing.notified', timestamp: new Date(), source: 'ulip', data: {}, metadata: {}
    })).toThrow('missing required data');
  });

  test('gate event for unknown container is rejected', () => {
    const service = new ULIPIntegrationService(
      { clientId: 'a', clientSecret: 'b', tokenEndpoint: 'https://ulip/token', defaultScope: ['x'] },
      { post: async () => ({ accessToken: 'tok', tokenType: 'Bearer', expiresIn: 3600, scope: ['x'] }) }
    );

    expect(() => service.processGateEvent({
      eventId: 'g-unknown', eventType: 'gate.out', timestamp: new Date(), source: 'ulip', data: {}, metadata: { containerId: 'MISSING' }
    })).toThrow('Unknown container');
  });

  test('port data query timeout/error bubbles up', async () => {
    const service = new ULIPIntegrationService(
      { clientId: 'a', clientSecret: 'b', tokenEndpoint: 'https://ulip/token', defaultScope: ['x'] },
      { post: async () => { throw new Error('timeout'); } }
    );

    await expect(service.queryPortData('INMUM')).rejects.toThrow('timeout');
  });

  test('rail booking with no available capacity is rejected', async () => {
    const service = new ULIPIntegrationService(
      { clientId: 'a', clientSecret: 'b', tokenEndpoint: 'https://ulip/token', defaultScope: ['x'] },
      {
        post: async (url: string) => {
          if (url.includes('/token')) {
            return { accessToken: 'tok', tokenType: 'Bearer', expiresIn: 3600, scope: ['x'] };
          }
          if (url.includes('/rail/capacity')) {
            return { availableWagons: 0, capacity: 0, transitTime: 20, cost: 1000 };
          }
          return { ok: true };
        },
      }
    );

    await expect(service.createRailBooking({
      containerId: 'C1',
      route: { origin: 'INMUM', destination: 'INCCU' },
      departureDate: new Date('2026-01-01T00:00:00.000Z'),
      capacity: 1,
    })).rejects.toThrow('No available rail capacity');
  });

  test('rail delay notification with invalid payload is rejected', () => {
    const service = new ULIPIntegrationService(
      { clientId: 'a', clientSecret: 'b', tokenEndpoint: 'https://ulip/token', defaultScope: ['x'] },
      { post: async () => ({ accessToken: 'tok', tokenType: 'Bearer', expiresIn: 3600, scope: ['x'] }) }
    );

    expect(() => service.processRailDelayNotification({
      eventId: 'd1', eventType: 'rail.delay.notified', timestamp: new Date(), source: 'ulip', data: {}, metadata: { containerId: 'C1' }
    })).toThrow('valid delayHours');
  });

  test('rail route query returns fallback route when ulip has none', async () => {
    const service = new ULIPIntegrationService(
      { clientId: 'a', clientSecret: 'b', tokenEndpoint: 'https://ulip/token', defaultScope: ['x'] },
      {
        post: async (url: string) => {
          if (url.includes('/token')) {
            return { accessToken: 'tok', tokenType: 'Bearer', expiresIn: 3600, scope: ['x'] };
          }
          if (url.includes('/rail/routes')) {
            return { routes: [] };
          }
          return { ok: true };
        },
      }
    );

    const routes = await service.queryRailRoutes('INMUM', 'INCCU');
    expect(routes).toHaveLength(1);
    expect(routes[0].origin).toBe('INMUM');
  });


  test('truck booking with no available trucks is rejected', async () => {
    const service = new ULIPIntegrationService(
      { clientId: 'a', clientSecret: 'b', tokenEndpoint: 'https://ulip/token', defaultScope: ['x'] },
      {
        post: async (url: string) => {
          if (url.includes('/token')) {
            return { accessToken: 'tok', tokenType: 'Bearer', expiresIn: 3600, scope: ['x'] };
          }
          if (url.includes('/road/availability')) {
            return { availableTrucks: 0, fleetProviders: [] };
          }
          return { ok: true };
        },
      }
    );

    await expect(service.createTruckBooking({
      containerId: 'C-TRUCK-1',
      pickupLocation: 'INMUM',
      deliveryLocation: 'INDEL',
      pickupDate: new Date('2026-01-02T00:00:00.000Z'),
      fleetProviderId: 'F1',
    })).rejects.toThrow('No available trucks');
  });

  test('GPS update for unknown truck is rejected', () => {
    const service = new ULIPIntegrationService(
      { clientId: 'a', clientSecret: 'b', tokenEndpoint: 'https://ulip/token', defaultScope: ['x'] },
      { post: async () => ({ accessToken: 'tok', tokenType: 'Bearer', expiresIn: 3600, scope: ['x'] }) }
    );

    expect(() => service.processTruckLocationUpdate({
      eventId: 'gps-unknown',
      eventType: 'truck.location.updated',
      timestamp: new Date(),
      source: 'ulip',
      data: { truckId: 'TRUCK-UNKNOWN', lat: 0, lon: 0 },
      metadata: { containerId: 'C-TRUCK-2' },
    })).toThrow('Unknown truck');
  });

  test('delivery confirmation with missing delivered flag is rejected', () => {
    const service = new ULIPIntegrationService(
      { clientId: 'a', clientSecret: 'b', tokenEndpoint: 'https://ulip/token', defaultScope: ['x'] },
      { post: async () => ({ accessToken: 'tok', tokenType: 'Bearer', expiresIn: 3600, scope: ['x'] }) }
    );

    expect(() => service.processDeliveryConfirmation({
      eventId: 'delivery-missing-flag',
      eventType: 'truck.delivery.confirmed',
      timestamp: new Date(),
      source: 'ulip',
      data: {},
      metadata: { containerId: 'C-TRUCK-3' },
    })).toThrow('delivered flag');
  });


  test('customs status for unknown container returns default pending state', async () => {
    const service = new ULIPIntegrationService(
      { clientId: 'a', clientSecret: 'b', tokenEndpoint: 'https://ulip/token', defaultScope: ['x'] },
      {
        post: async (url: string) => {
          if (url.includes('/token')) {
            return { accessToken: 'tok', tokenType: 'Bearer', expiresIn: 3600, scope: ['x'] };
          }
          if (url.includes('/customs/status')) {
            return {};
          }
          return { ok: true };
        },
      }
    );

    const status = await service.getCustomsStatus('UNKNOWN-CONT');
    expect(status.containerId).toBe('UNKNOWN-CONT');
    expect(status.status).toBe('PENDING');
  });

  test('customs document submission failure bubbles error', async () => {
    const service = new ULIPIntegrationService(
      { clientId: 'a', clientSecret: 'b', tokenEndpoint: 'https://ulip/token', defaultScope: ['x'] },
      {
        post: async (url: string) => {
          if (url.includes('/token')) {
            return { accessToken: 'tok', tokenType: 'Bearer', expiresIn: 3600, scope: ['x'] };
          }
          if (url.includes('/customs/documents')) {
            throw new Error('document exchange failed');
          }
          return { ok: true };
        },
      }
    );

    await expect(service.submitCustomsDocuments('C1', [
      { type: 'BOE', content: 'x', format: 'PDF' },
    ])).rejects.toThrow('document exchange failed');
  });

  test('regulatory hold alert with missing reason is rejected', () => {
    const service = new ULIPIntegrationService(
      { clientId: 'a', clientSecret: 'b', tokenEndpoint: 'https://ulip/token', defaultScope: ['x'] },
      { post: async () => ({ accessToken: 'tok', tokenType: 'Bearer', expiresIn: 3600, scope: ['x'] }) }
    );

    expect(() => service.processRegulatoryHoldAlert({
      eventId: 'hold-missing-reason',
      eventType: 'customs.hold.alerted',
      timestamp: new Date(),
      source: 'ulip',
      data: {},
      metadata: { containerId: 'C2' },
    })).toThrow('missing reason');
  });


  test('invalid ISO 6346 container IDs are rejected by validator', () => {
    const service = new ULIPIntegrationService(
      { clientId: 'a', clientSecret: 'b', tokenEndpoint: 'https://ulip/token', defaultScope: ['x'] },
      { post: async () => ({ accessToken: 'tok', tokenType: 'Bearer', expiresIn: 3600, scope: ['x'] }) }
    );

    expect(service.validateISO6346ContainerId('ABC1234567')).toBe(false);
    expect(service.validateISO6346ContainerId('ABCD12345')).toBe(false);
    expect(service.validateISO6346ContainerId('abcd1234567')).toBe(false);
  });

  test('invalid UN/LOCODE formats are rejected by validator', () => {
    const service = new ULIPIntegrationService(
      { clientId: 'a', clientSecret: 'b', tokenEndpoint: 'https://ulip/token', defaultScope: ['x'] },
      { post: async () => ({ accessToken: 'tok', tokenType: 'Bearer', expiresIn: 3600, scope: ['x'] }) }
    );

    expect(service.validateUNLocode('INDELH')).toBe(false);
    expect(service.validateUNLocode('inDEL')).toBe(false);
    expect(service.validateUNLocode('12345')).toBe(false);
  });

  test('timestamp formatter converts UTC to IST offset format', () => {
    const service = new ULIPIntegrationService(
      { clientId: 'a', clientSecret: 'b', tokenEndpoint: 'https://ulip/token', defaultScope: ['x'] },
      { post: async () => ({ accessToken: 'tok', tokenType: 'Bearer', expiresIn: 3600, scope: ['x'] }) }
    );

    const formatted = service.formatTimestampIST(new Date('2026-01-01T00:00:00.000Z'));
    expect(formatted).toContain('2026-01-01T05:30:00.000');
    expect(formatted.endsWith('+05:30')).toBe(true);
  });


  test('metrics publishing with missing data is rejected', async () => {
    const service = new ULIPIntegrationService(
      { clientId: 'a', clientSecret: 'b', tokenEndpoint: 'https://ulip/token', defaultScope: ['x'] },
      { post: async () => ({ accessToken: 'tok', tokenType: 'Bearer', expiresIn: 3600, scope: ['x'] }) }
    );

    await expect(service.publishPerformanceMetrics({
      transitTimeHours: -1,
      demurrageCost: 100,
      slotUtilization: 0.7,
    })).rejects.toThrow('Invalid metrics payload');
  });

  test('dashboard data access timeout bubbles up', async () => {
    const service = new ULIPIntegrationService(
      { clientId: 'a', clientSecret: 'b', tokenEndpoint: 'https://ulip/token', defaultScope: ['x'] },
      {
        post: async (url: string) => {
          if (url.includes('/token')) {
            return { accessToken: 'tok', tokenType: 'Bearer', expiresIn: 3600, scope: ['x'] };
          }
          if (url.includes('/analytics/dashboard')) {
            throw new Error('dashboard timeout');
          }
          return { ok: true };
        },
      }
    );

    await expect(service.getNationalLogisticsDashboardData('IN')).rejects.toThrow('dashboard timeout');
  });

  test('anonymization redacts sensitive fields', () => {
    const service = new ULIPIntegrationService(
      { clientId: 'a', clientSecret: 'b', tokenEndpoint: 'https://ulip/token', defaultScope: ['x'] },
      { post: async () => ({ accessToken: 'tok', tokenType: 'Bearer', expiresIn: 3600, scope: ['x'] }) }
    );

    const out = service.anonymizeOperationalData({
      retailerId: 'R-100',
      phone: '9999999999',
      transitTimeHours: 20,
    });

    expect(out.retailerId).toBe('[REDACTED]');
    expect(out.phone).toBe('[REDACTED]');
    expect(out.transitTimeHours).toBe(20);
  });

});
