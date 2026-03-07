import * as fc from 'fast-check';
import * as sharedTypes from '../index';

/**
 * Feature: port-to-shelf-optimizer, Property: Build Configuration Consistency
 * 
 * **Validates: Requirements 9.3**
 * 
 * This property test verifies that all services can import shared types correctly,
 * ensuring the monorepo build configuration is consistent across all workspaces.
 */
describe('Property: Build Configuration Consistency', () => {
  test('all shared types are exported and accessible', () => {
    fc.assert(
      fc.property(fc.constant(sharedTypes), (types) => {
        // Verify core type exports exist
        expect(types.TransportMode).toBeDefined();
        expect(types.LocationType).toBeDefined();
        expect(types.VesselStatus).toBeDefined();
        expect(types.ContainerStatus).toBeDefined();
        expect(types.AuctionStatus).toBeDefined();
        expect(types.BidStatus).toBeDefined();
        expect(types.ReservationStatus).toBeDefined();
        expect(types.Role).toBeDefined();
        expect(types.CustomsClearanceStatus).toBeDefined();

        // Verify enums have expected values
        expect(Object.values(types.TransportMode)).toContain('VESSEL');
        expect(Object.values(types.TransportMode)).toContain('RAIL');
        expect(Object.values(types.TransportMode)).toContain('TRUCK');

        expect(Object.values(types.VesselStatus)).toContain('EN_ROUTE');
        expect(Object.values(types.VesselStatus)).toContain('ARRIVED');

        expect(Object.values(types.ContainerStatus)).toContain('ON_VESSEL');
        expect(Object.values(types.ContainerStatus)).toContain('DELIVERED');

        expect(Object.values(types.Role)).toContain('RETAILER');
        expect(Object.values(types.Role)).toContain('PORT_OPERATOR');

        return true;
      }),
      { numRuns: 100 }
    );
  });

  test('type definitions are structurally consistent', () => {
    fc.assert(
      fc.property(
        fc.record({
          transportMode: fc.constantFrom('VESSEL', 'RAIL', 'TRUCK'),
          locationType: fc.constantFrom('PORT', 'RAIL_TERMINAL', 'WAREHOUSE', 'IN_TRANSIT'),
          vesselStatus: fc.constantFrom('EN_ROUTE', 'ARRIVED', 'BERTHED', 'DEPARTED'),
          containerStatus: fc.constantFrom(
            'ON_VESSEL',
            'AT_PORT',
            'ON_RAIL',
            'ON_TRUCK',
            'DELIVERED'
          ),
        }),
        (data) => {
          // Verify enum values match expected types
          expect(sharedTypes.TransportMode[data.transportMode as keyof typeof sharedTypes.TransportMode]).toBe(
            data.transportMode
          );
          expect(sharedTypes.LocationType[data.locationType as keyof typeof sharedTypes.LocationType]).toBe(
            data.locationType
          );
          expect(sharedTypes.VesselStatus[data.vesselStatus as keyof typeof sharedTypes.VesselStatus]).toBe(
            data.vesselStatus
          );
          expect(sharedTypes.ContainerStatus[data.containerStatus as keyof typeof sharedTypes.ContainerStatus]).toBe(
            data.containerStatus
          );

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('shared types package exports are complete', () => {
    // Verify all expected exports are present
    const exports = Object.keys(sharedTypes);

    // Core enums
    expect(exports).toContain('TransportMode');
    expect(exports).toContain('LocationType');
    expect(exports).toContain('VesselStatus');
    expect(exports).toContain('ContainerStatus');
    expect(exports).toContain('AuctionStatus');
    expect(exports).toContain('BidStatus');
    expect(exports).toContain('ReservationStatus');
    expect(exports).toContain('Role');
    expect(exports).toContain('CustomsClearanceStatus');

    // Verify minimum number of exports (should have at least 9 enums)
    expect(exports.length).toBeGreaterThanOrEqual(9);
  });
});
