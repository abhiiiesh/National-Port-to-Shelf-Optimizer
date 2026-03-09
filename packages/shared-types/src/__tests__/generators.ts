import fc from 'fast-check';
import {
  Auction,
  AuctionStatus,
  Bid,
  BidStatus,
  Container,
  ContainerStatus,
  JourneyEvent,
  Location,
  LocationType,
  Position,
  TransportMode,
  Vessel,
  VesselStatus,
} from '../index';
import { ArrivalPrediction } from '../prediction';

export const iso6346ContainerIdArbitrary = () =>
  fc
    .tuple(fc.stringMatching(/^[A-Z]{4}$/), fc.stringMatching(/^\d{7}$/))
    .map(([owner, serial]) => `${owner}${serial}`);

export const unLocodeArbitrary = () =>
  fc
    .tuple(fc.stringMatching(/^[A-Z]{2}$/), fc.stringMatching(/^[A-Z0-9]{3}$/))
    .map(([country, code]) => `${country}${code}`);

export const validPositionArbitrary = () =>
  fc.record<Position>({
    latitude: fc.double({ min: -90, max: 90, noNaN: true, noDefaultInfinity: true }),
    longitude: fc.double({ min: -180, max: 180, noNaN: true, noDefaultInfinity: true }),
    timestamp: fc.date(),
    speed: fc.double({ min: 0, max: 40, noNaN: true, noDefaultInfinity: true }),
    heading: fc.double({ min: 0, max: 360, noNaN: true, noDefaultInfinity: true }),
  });

const locationArbitrary = (type: LocationType) =>
  fc.record<Location>({
    type: fc.constant(type),
    id: unLocodeArbitrary(),
    name: fc.string({ minLength: 3, maxLength: 30 }),
    coordinates: validPositionArbitrary(),
  });

export const bidArbitrary = () =>
  fc.record<Bid>({
    id: fc.uuid(),
    auctionId: fc.uuid(),
    slotId: fc.uuid(),
    retailerId: fc.string({ minLength: 3, maxLength: 20 }),
    containerId: iso6346ContainerIdArbitrary(),
    bidAmount: fc.integer({ min: 100, max: 100000 }),
    timestamp: fc.date(),
    status: fc.constantFrom(BidStatus.SUBMITTED, BidStatus.ACCEPTED, BidStatus.REJECTED, BidStatus.OUTBID),
  });

export const vesselArbitrary = () =>
  fc.record<Vessel>({
    id: fc.uuid(),
    name: fc.string({ minLength: 3, maxLength: 50 }),
    imoNumber: fc.stringMatching(/^\d{7}$/),
    currentPosition: validPositionArbitrary(),
    estimatedArrival: fc.record({
      portId: unLocodeArbitrary(),
      estimatedTime: fc.date(),
      confidenceInterval: fc.double({ min: 0, max: 48, noNaN: true, noDefaultInfinity: true }),
      lastUpdated: fc.date(),
    }),
    containerManifest: fc.record({
      totalContainers: fc.integer({ min: 0, max: 5000 }),
      containerIds: fc.array(iso6346ContainerIdArbitrary(), { maxLength: 20 }),
    }),
    status: fc.constantFrom(VesselStatus.EN_ROUTE, VesselStatus.ARRIVED, VesselStatus.BERTHED, VesselStatus.DEPARTED),
  });

export const containerJourneyScenarioArbitrary = () =>
  fc.record<{ container: Container; journey: JourneyEvent[] }>({
    container: fc.record<Container>({
      id: iso6346ContainerIdArbitrary(),
      ownerId: fc.string({ minLength: 3, maxLength: 20 }),
      currentLocation: locationArbitrary(LocationType.IN_TRANSIT),
      currentMode: fc.constant(TransportMode.VESSEL),
      status: fc.constant(ContainerStatus.ON_VESSEL),
      journey: fc.constant([]),
    }),
    journey: fc.constantFrom(
      {
        eventType: 'container.mode.changed',
        transportMode: TransportMode.VESSEL,
        locationType: LocationType.PORT,
      },
      {
        eventType: 'container.mode.changed',
        transportMode: TransportMode.RAIL,
        locationType: LocationType.RAIL_TERMINAL,
      },
      {
        eventType: 'container.mode.changed',
        transportMode: TransportMode.TRUCK,
        locationType: LocationType.IN_TRANSIT,
      },
      {
        eventType: 'container.delivered',
        transportMode: TransportMode.TRUCK,
        locationType: LocationType.WAREHOUSE,
      }
    ).chain((first) =>
      fc.array(
        fc.constantFrom(first),
        { minLength: 4, maxLength: 4 }
      ).map((states) =>
        states.map((state, idx) => ({
          timestamp: new Date(Date.UTC(2026, 0, 1, idx)),
          eventType: state.eventType,
          location: {
            type: state.locationType,
            id: 'INMUM',
            name: 'Generated',
            coordinates: {
              latitude: 19.076,
              longitude: 72.8777,
              timestamp: new Date(Date.UTC(2026, 0, 1, idx)),
              speed: 0,
              heading: 0,
            },
          },
          transportMode: state.transportMode,
          metadata: {},
        }))
      )
    ),
  });

export const auctionWithMultipleBidsArbitrary = () =>
  fc.record<{ auction: Auction; bids: Bid[] }>({
    auction: fc.record<Auction>({
      id: fc.uuid(),
      vesselId: fc.uuid(),
      portId: unLocodeArbitrary(),
      slots: fc.array(
        fc.record({
          id: fc.uuid(),
          transportMode: fc.constantFrom(TransportMode.RAIL, TransportMode.TRUCK),
          origin: unLocodeArbitrary(),
          destination: unLocodeArbitrary(),
          departureTime: fc.date(),
          capacity: fc.integer({ min: 1, max: 3 }),
          minimumBid: fc.integer({ min: 100, max: 1000 }),
        }),
        { minLength: 1, maxLength: 3 }
      ),
      startTime: fc.date(),
      endTime: fc.date(),
      status: fc.constant(AuctionStatus.ACTIVE),
      bids: fc.constant([]),
    }),
    bids: fc.array(bidArbitrary(), { minLength: 2, maxLength: 8 }),
  });

export const vesselWithArrivalPredictionArbitrary = () =>
  fc.record<{ vessel: Vessel; prediction: ArrivalPrediction }>({
    vessel: vesselArbitrary(),
    prediction: fc.record<ArrivalPrediction>({
      vesselId: fc.uuid(),
      portId: unLocodeArbitrary(),
      predictedArrivalTime: fc.date(),
      confidenceInterval: fc.double({ min: 0, max: 48, noNaN: true, noDefaultInfinity: true }),
      confidence: fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
      factors: fc.record({
        currentSpeed: fc.double({ min: 0, max: 40, noNaN: true, noDefaultInfinity: true }),
        distanceRemaining: fc.double({ min: 0, max: 10000, noNaN: true, noDefaultInfinity: true }),
        weatherConditions: fc.record({
          windSpeed: fc.double({ min: 0, max: 120, noNaN: true, noDefaultInfinity: true }),
          waveHeight: fc.double({ min: 0, max: 20, noNaN: true, noDefaultInfinity: true }),
          visibility: fc.double({ min: 0, max: 10, noNaN: true, noDefaultInfinity: true }),
          forecast: fc.string({ minLength: 3, maxLength: 30 }),
        }),
        historicalAverageSpeed: fc.double({ min: 0, max: 40, noNaN: true, noDefaultInfinity: true }),
        portCongestion: fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
      }),
      generatedAt: fc.date(),
    }),
  });
