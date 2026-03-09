import { DomainEvent, PortData, RailBookingRequest, RailCapacity, ULIPEvent, ULIPToken } from '@port-to-shelf/shared-types';

export interface RailRouteOption {
  origin: string;
  destination: string;
  transitTime: number;
  distanceKm: number;
}

export interface RailBookingConfirmation {
  bookingId: string;
  containerId: string;
  route: { origin: string; destination: string };
  scheduledDeparture: Date;
  estimatedArrival: Date;
  cost: number;
  status: 'CONFIRMED';
}

export interface AuthConfig {
  clientId: string;
  clientSecret: string;
  tokenEndpoint: string;
  defaultScope: string[];
}

export interface PublishConfig {
  maxRetries: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
  circuitBreakerThreshold: number;
  publishTimeoutMs: number;
}

export interface HttpClient {
  post<T>(url: string, body: unknown, headers?: Record<string, string>): Promise<T>;
}

export interface EventBusLike {
  publish(event: DomainEvent): Promise<boolean>;
  subscribe(topic: string, consumerGroup: string, handler: (event: DomainEvent) => Promise<void>): unknown;
}

class CircuitBreaker {
  private failures = 0;
  private openedAt?: number;

  constructor(private readonly threshold: number, private readonly cooldownMs: number) {}

  isOpen(now = Date.now()): boolean {
    if (!this.openedAt) return false;
    if (now - this.openedAt > this.cooldownMs) {
      this.openedAt = undefined;
      this.failures = 0;
      return false;
    }
    return true;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.openedAt = undefined;
  }

  recordFailure(now = Date.now()): void {
    this.failures += 1;
    if (this.failures >= this.threshold) {
      this.openedAt = now;
    }
  }
}

export class ULIPIntegrationService {
  private token?: ULIPToken;
  private tokenIssuedAt?: number;
  private readonly circuitBreaker: CircuitBreaker;
  private lastEventById = new Map<string, ULIPEvent>();
  private readonly knownContainers = new Set<string>();
  private readonly latestBerthingByVessel = new Map<string, ULIPEvent>();
  private readonly latestRailTrackingByContainer = new Map<string, ULIPEvent>();
  private readonly latestRailDelayByContainer = new Map<string, ULIPEvent>();

  constructor(
    private readonly auth: AuthConfig,
    private readonly http: HttpClient,
    private readonly publishConfig: PublishConfig = {
      maxRetries: 3,
      initialBackoffMs: 200,
      maxBackoffMs: 5000,
      circuitBreakerThreshold: 3,
      publishTimeoutMs: 30_000,
    }
  ) {
    this.circuitBreaker = new CircuitBreaker(this.publishConfig.circuitBreakerThreshold, 30_000);
  }

  async authenticate(forceRefresh = false): Promise<ULIPToken> {
    if (!forceRefresh && this.token && this.tokenIssuedAt && !this.isTokenExpired()) {
      return this.token;
    }

    const body = {
      grant_type: 'client_credentials',
      client_id: this.auth.clientId,
      client_secret: this.auth.clientSecret,
      scope: this.auth.defaultScope.join(' '),
    };

    const response = await this.http.post<ULIPToken>(this.auth.tokenEndpoint, body, {
      'content-type': 'application/json',
    });

    this.token = response;
    this.tokenIssuedAt = Date.now();
    return response;
  }

  isHealthy(): boolean {
    return !this.circuitBreaker.isOpen() && Boolean(this.token);
  }

  async queryPortData(portId: string): Promise<PortData> {
    const majorPorts = new Set(['INNSA', 'INMUM', 'INCCU', 'INVTZ']);
    if (!majorPorts.has(portId)) {
      throw new Error(`Unsupported port for ULIP query: ${portId}`);
    }

    await this.authenticate();
    const response = await this.http.post<Partial<PortData>>(
      'https://ulip.example/ports/query',
      { portId },
      { authorization: `Bearer ${this.token?.accessToken}`, 'content-type': 'application/json' }
    );

    return {
      portId,
      name: response.name ?? `Port-${portId}`,
      congestionLevel: response.congestionLevel ?? 0.35,
      availableBerths: response.availableBerths ?? 4,
      averageWaitTime: response.averageWaitTime ?? 6,
      gateOperatingHours: response.gateOperatingHours ?? {
        open: '06:00',
        close: '22:00',
        timezone: 'Asia/Kolkata',
      },
    };
  }

  processBerthingNotification(event: ULIPEvent): ULIPEvent {
    this.validateEvent(event);
    if (!event.metadata.vesselId || !event.metadata.location) {
      throw new Error('Berthing notification missing required data');
    }

    const existing = this.latestBerthingByVessel.get(event.metadata.vesselId);
    if (!existing || event.timestamp.getTime() >= existing.timestamp.getTime()) {
      this.latestBerthingByVessel.set(event.metadata.vesselId, event);
    }

    return this.latestBerthingByVessel.get(event.metadata.vesselId)!;
  }

  processGateEvent(event: ULIPEvent): ULIPEvent {
    this.validateEvent(event);
    const containerId = event.metadata.containerId;
    if (!containerId) {
      throw new Error('Gate event missing container id');
    }

    if (event.eventType === 'gate.in') {
      this.knownContainers.add(containerId);
      return event;
    }

    if (event.eventType === 'gate.out') {
      if (!this.knownContainers.has(containerId)) {
        throw new Error(`Unknown container for gate event: ${containerId}`);
      }
      return event;
    }

    throw new Error(`Unsupported gate event type: ${event.eventType}`);
  }

  async publishContainerPickupRequest(containerId: string, portId: string): Promise<void> {
    const event: ULIPEvent = {
      eventId: `pickup-${containerId}-${Date.now()}`,
      eventType: 'container.pickup.requested',
      timestamp: new Date(),
      source: 'ulip-integration',
      data: { containerId, portId },
      metadata: { containerId, location: portId },
    };
    await this.publishEvent(event);
  }

  async queryRailCapacity(route: { origin: string; destination: string }, date: Date): Promise<RailCapacity> {
    await this.authenticate();

    const response = await this.http.post<Partial<RailCapacity>>(
      'https://ulip.example/rail/capacity',
      { route, date: date.toISOString() },
      { authorization: `Bearer ${this.token?.accessToken}`, 'content-type': 'application/json' }
    );

    const availableWagons = response.availableWagons ?? 40;
    const capacity = response.capacity ?? Math.max(availableWagons, 1) * 2;

    return {
      route,
      date,
      availableWagons,
      capacity,
      transitTime: response.transitTime ?? 24,
      cost: response.cost ?? capacity * 1500,
    };
  }

  async createRailBooking(booking: RailBookingRequest): Promise<RailBookingConfirmation> {
    if (booking.capacity <= 0) {
      throw new Error('Rail booking capacity must be greater than zero');
    }

    const availability = await this.queryRailCapacity(booking.route, booking.departureDate);
    if (availability.capacity < booking.capacity || availability.availableWagons <= 0) {
      throw new Error('No available rail capacity for booking');
    }

    await this.authenticate();
    const response = await this.http.post<Partial<RailBookingConfirmation>>(
      'https://ulip.example/rail/bookings',
      {
        containerId: booking.containerId,
        route: booking.route,
        departureDate: booking.departureDate.toISOString(),
        capacity: booking.capacity,
      },
      { authorization: `Bearer ${this.token?.accessToken}`, 'content-type': 'application/json' }
    );

    const transitHours = availability.transitTime;
    return {
      bookingId: response.bookingId ?? `rail-${booking.containerId}-${booking.departureDate.getTime()}`,
      containerId: booking.containerId,
      route: booking.route,
      scheduledDeparture: booking.departureDate,
      estimatedArrival: new Date(booking.departureDate.getTime() + transitHours * 60 * 60 * 1000),
      cost: response.cost ?? availability.cost,
      status: 'CONFIRMED',
    };
  }

  processRailTrackingUpdate(event: ULIPEvent): ULIPEvent {
    this.validateEvent(event);
    const containerId = event.metadata.containerId;
    if (!containerId) {
      throw new Error('Rail tracking update missing container id');
    }

    const existing = this.latestRailTrackingByContainer.get(containerId);
    if (!existing || event.timestamp.getTime() >= existing.timestamp.getTime()) {
      this.latestRailTrackingByContainer.set(containerId, event);
    }

    return this.latestRailTrackingByContainer.get(containerId)!;
  }

  processRailDelayNotification(event: ULIPEvent): ULIPEvent {
    this.validateEvent(event);
    const containerId = event.metadata.containerId;
    if (!containerId) {
      throw new Error('Rail delay notification missing container id');
    }

    const delayHours = event.data.delayHours;
    if (typeof delayHours !== 'number' || delayHours < 0) {
      throw new Error('Rail delay notification missing valid delayHours');
    }

    const existing = this.latestRailDelayByContainer.get(containerId);
    if (!existing || event.timestamp.getTime() >= existing.timestamp.getTime()) {
      this.latestRailDelayByContainer.set(containerId, event);
    }

    return this.latestRailDelayByContainer.get(containerId)!;
  }

  async queryRailRoutes(origin: string, destination: string): Promise<RailRouteOption[]> {
    await this.authenticate();
    const response = await this.http.post<{ routes?: RailRouteOption[] }>(
      'https://ulip.example/rail/routes',
      { origin, destination },
      { authorization: `Bearer ${this.token?.accessToken}`, 'content-type': 'application/json' }
    );

    if (response.routes && response.routes.length > 0) {
      return response.routes.filter((route) => route.transitTime > 0);
    }

    return [
      {
        origin,
        destination,
        transitTime: 30,
        distanceKm: 1200,
      },
    ];
  }

  async publishEvent(event: ULIPEvent): Promise<void> {
    this.validateEvent(event);
    if (this.circuitBreaker.isOpen()) {
      throw new Error('Circuit breaker is open');
    }

    await this.authenticate();

    const startedAt = Date.now();
    let attempt = 0;

    while (attempt <= this.publishConfig.maxRetries) {
      try {
        if (Date.now() - startedAt > this.publishConfig.publishTimeoutMs) {
          throw new Error('Publish timeout exceeded');
        }

        await this.http.post('https://ulip.example/events', event, {
          authorization: `Bearer ${this.token?.accessToken}`,
          'content-type': 'application/json',
        });
        this.circuitBreaker.recordSuccess();
        return;
      } catch (error) {
        this.circuitBreaker.recordFailure();
        attempt += 1;
        if (attempt > this.publishConfig.maxRetries) {
          throw error;
        }

        const delay = Math.min(
          this.publishConfig.maxBackoffMs,
          this.publishConfig.initialBackoffMs * 2 ** (attempt - 1)
        );
        await this.sleep(delay);
      }
    }
  }

  subscribeToEvents(eventBus: EventBusLike, callback: (event: ULIPEvent) => Promise<void>): void {
    const topics = ['port.operation.updated', 'rail.movement.updated', 'road.transport.updated'];

    topics.forEach((topic) => {
      eventBus.subscribe(topic, 'ulip-integration', async (event) => {
        const ulipEvent = this.toULIPEvent(event);
        this.validateEvent(ulipEvent);

        const existing = this.lastEventById.get(ulipEvent.eventId);
        if (!existing || ulipEvent.timestamp.getTime() >= existing.timestamp.getTime()) {
          this.lastEventById.set(ulipEvent.eventId, ulipEvent);
          await callback(ulipEvent);
        }
      });
    });
  }

  private toULIPEvent(event: DomainEvent): ULIPEvent {
    return {
      eventId: event.eventId,
      eventType: event.eventType,
      timestamp: event.timestamp,
      source: event.source,
      data: event.payload,
      metadata: {},
    };
  }

  private validateEvent(event: ULIPEvent): void {
    if (!event.eventId || !event.eventType || !event.timestamp || !event.source) {
      throw new Error('Invalid ULIP event format');
    }
  }

  private isTokenExpired(): boolean {
    if (!this.token || !this.tokenIssuedAt) return true;
    return Date.now() - this.tokenIssuedAt >= this.token.expiresIn * 1000;
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
