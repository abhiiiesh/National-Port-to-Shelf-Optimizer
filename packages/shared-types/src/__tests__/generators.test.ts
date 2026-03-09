import fc from 'fast-check';
import {
  auctionWithMultipleBidsArbitrary,
  containerJourneyScenarioArbitrary,
  iso6346ContainerIdArbitrary,
  unLocodeArbitrary,
  validPositionArbitrary,
  vesselWithArrivalPredictionArbitrary,
} from './generators';

describe('Task 30.3 - Generator unit tests', () => {
  test('ISO 6346 generator produces valid IDs', () => {
    fc.assert(
      fc.property(iso6346ContainerIdArbitrary(), (id) => {
        expect(id).toMatch(/^[A-Z]{4}\d{7}$/);
      }),
      { numRuns: 200 }
    );
  });

  test('UN/LOCODE generator produces valid codes', () => {
    fc.assert(
      fc.property(unLocodeArbitrary(), (code) => {
        expect(code).toMatch(/^[A-Z]{2}[A-Z0-9]{3}$/);
      }),
      { numRuns: 200 }
    );
  });

  test('position generator produces valid coordinates', () => {
    fc.assert(
      fc.property(validPositionArbitrary(), (position) => {
        expect(position.latitude).toBeGreaterThanOrEqual(-90);
        expect(position.latitude).toBeLessThanOrEqual(90);
        expect(position.longitude).toBeGreaterThanOrEqual(-180);
        expect(position.longitude).toBeLessThanOrEqual(180);
      }),
      { numRuns: 200 }
    );
  });

  test('container journey scenario includes vessel -> rail -> truck -> delivered progression', () => {
    fc.assert(
      fc.property(containerJourneyScenarioArbitrary(), ({ journey }) => {
        expect(journey).toHaveLength(4);
        expect(journey.map((event) => event.transportMode)).toEqual(['VESSEL', 'RAIL', 'TRUCK', 'TRUCK']);
        expect(journey.map((event) => event.eventType)).toEqual([
          'container.mode.changed',
          'container.mode.changed',
          'container.mode.changed',
          'container.delivered',
        ]);
      }),
      { numRuns: 100 }
    );
  });

  test('auction and prediction scenario generators create coherent payloads', () => {
    fc.assert(
      fc.property(
        auctionWithMultipleBidsArbitrary(),
        vesselWithArrivalPredictionArbitrary(),
        ({ auction, bids }, { vessel, prediction }) => {
          expect(auction.slots.length).toBeGreaterThan(0);
          expect(bids.length).toBeGreaterThanOrEqual(2);
          expect(prediction.confidence).toBeGreaterThanOrEqual(0);
          expect(prediction.confidence).toBeLessThanOrEqual(1);
          expect(vessel.imoNumber).toMatch(/^\d{7}$/);
        }
      ),
      { numRuns: 100 }
    );
  });
});
