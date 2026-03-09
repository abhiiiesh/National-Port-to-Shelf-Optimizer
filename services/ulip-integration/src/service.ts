import { DomainEvent, PortData, ULIPEvent, ULIPToken } from '@port-to-shelf/shared-types';

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
