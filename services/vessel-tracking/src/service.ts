import { DomainEvent, Position, Vessel, VesselRegistration, VesselStatus } from '@port-to-shelf/shared-types';
import { VesselRepository } from './repository';

export interface EventPublisher {
  publish(event: DomainEvent): Promise<boolean>;
}

export interface VesselTrackingConfig {
  etaRecalculationHours?: number;
}

export class VesselTrackingService {
  private readonly vesselHistory = new Map<string, Position[]>();

  constructor(
    private readonly repository = new VesselRepository(),
    private readonly eventPublisher?: EventPublisher,
    private readonly config: VesselTrackingConfig = {}
  ) {}

  async registerVessel(registration: VesselRegistration): Promise<Vessel> {
    this.validatePosition(registration.initialPosition);

    if (this.repository.findByImoNumber(registration.imoNumber)) {
      throw new Error(`Vessel with IMO ${registration.imoNumber} already exists`);
    }

    const now = registration.initialPosition.timestamp;
    const etaHours = this.config.etaRecalculationHours ?? 24;

    const vessel: Vessel = {
      id: this.createId(),
      name: registration.name,
      imoNumber: registration.imoNumber,
      currentPosition: registration.initialPosition,
      estimatedArrival: {
        portId: registration.destinationPort,
        estimatedTime: new Date(now.getTime() + etaHours * 60 * 60 * 1000),
        confidenceInterval: 6,
        lastUpdated: now,
      },
      containerManifest: registration.containerManifest,
      status: VesselStatus.EN_ROUTE,
    };

    this.repository.create(vessel);
    this.vesselHistory.set(vessel.id, [registration.initialPosition]);
    return vessel;
  }

  async updatePosition(vesselId: string, position: Position): Promise<Vessel> {
    this.validatePosition(position);
    const existing = this.mustGetVessel(vesselId);

    const etaHours = this.config.etaRecalculationHours ?? 24;
    const updated: Vessel = {
      ...existing,
      currentPosition: position,
      estimatedArrival: {
        ...existing.estimatedArrival,
        estimatedTime: new Date(position.timestamp.getTime() + etaHours * 60 * 60 * 1000),
        lastUpdated: position.timestamp,
      },
      status: VesselStatus.EN_ROUTE,
    };

    this.repository.update(updated);
    const history = this.vesselHistory.get(vesselId) ?? [];
    history.push(position);
    this.vesselHistory.set(vesselId, history);

    await this.publishEvent({
      eventId: `${vesselId}-${position.timestamp.getTime()}-position`,
      eventType: 'vessel.position.updated',
      timestamp: position.timestamp,
      source: 'vessel-tracking',
      version: 1,
      payload: {
        vesselId,
        position,
        estimatedArrival: updated.estimatedArrival,
      },
    });

    return updated;
  }

  async recordArrival(vesselId: string, timestamp: Date): Promise<Vessel> {
    const existing = this.mustGetVessel(vesselId);

    const arrived: Vessel = {
      ...existing,
      status: VesselStatus.ARRIVED,
      estimatedArrival: {
        ...existing.estimatedArrival,
        estimatedTime: timestamp,
        lastUpdated: timestamp,
      },
    };

    this.repository.update(arrived);

    await this.publishEvent({
      eventId: `${vesselId}-${timestamp.getTime()}-arrived`,
      eventType: 'vessel.arrived',
      timestamp,
      source: 'vessel-tracking',
      version: 1,
      payload: {
        vesselId,
        portId: arrived.estimatedArrival.portId,
        arrivedAt: timestamp,
      },
    });

    return arrived;
  }

  getVessel(vesselId: string): Vessel | undefined {
    return this.repository.findById(vesselId);
  }

  listActiveVessels(): Vessel[] {
    return this.repository.list().filter((vessel) => vessel.status === VesselStatus.EN_ROUTE);
  }

  getPositionHistory(vesselId: string): Position[] {
    return [...(this.vesselHistory.get(vesselId) ?? [])];
  }

  private mustGetVessel(vesselId: string): Vessel {
    const vessel = this.repository.findById(vesselId);
    if (!vessel) {
      throw new Error(`Vessel ${vesselId} not found`);
    }

    return vessel;
  }

  private validatePosition(position: Position): void {
    if (position.latitude < -90 || position.latitude > 90) {
      throw new Error('Invalid latitude');
    }

    if (position.longitude < -180 || position.longitude > 180) {
      throw new Error('Invalid longitude');
    }
  }

  private async publishEvent(event: DomainEvent): Promise<void> {
    if (!this.eventPublisher) {
      return;
    }

    await this.eventPublisher.publish(event);
  }

  private createId(): string {
    return `vessel-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
