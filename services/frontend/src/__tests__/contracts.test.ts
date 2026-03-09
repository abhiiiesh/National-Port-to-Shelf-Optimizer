import {
  API_CONTRACT_VERSION,
  isApiErrorEnvelope,
  isFrontendPerformanceSnapshot,
  isFrontendVesselSummary,
} from '../config/contracts';

describe('frontend API contract guards', () => {
  it('uses explicit API contract versioning', () => {
    expect(API_CONTRACT_VERSION).toBe('v1');
  });

  it('validates vessel summary payload shape', () => {
    const valid = {
      vesselId: 'v-101',
      vesselName: 'MSC Atlas',
      eta: '2026-03-09T12:00:00Z',
      status: 'ON_TIME',
    };

    const invalid = {
      vesselId: 'v-101',
      vesselName: 'MSC Atlas',
      eta: '2026-03-09T12:00:00Z',
      status: 'UNKNOWN',
    };

    expect(isFrontendVesselSummary(valid)).toBe(true);
    expect(isFrontendVesselSummary(invalid)).toBe(false);
  });

  it('validates performance snapshot payload shape', () => {
    expect(
      isFrontendPerformanceSnapshot({
        totalShipments: 100,
        delayedShipments: 4,
        avgTransitHours: 13.6,
      }),
    ).toBe(true);

    expect(
      isFrontendPerformanceSnapshot({
        totalShipments: '100',
        delayedShipments: 4,
        avgTransitHours: 13.6,
      }),
    ).toBe(false);
  });

  it('validates API error envelope shape', () => {
    expect(isApiErrorEnvelope({ code: 'UNAUTHORIZED', message: 'Invalid token' })).toBe(true);
    expect(isApiErrorEnvelope({ code: 'UNAUTHORIZED' })).toBe(false);
  });
});
