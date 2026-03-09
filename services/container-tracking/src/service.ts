import {
  Container,
  ContainerQuery,
  ContainerRegistration,
  ContainerStatus,
  DemurrageInfo,
  DomainEvent,
  JourneyEvent,
  Location,
  LocationType,
  Position,
  TransportMode,
} from '@port-to-shelf/shared-types';
import { ContainerRepository } from './repository';

export interface EventPublisher {
  publish(event: DomainEvent): Promise<boolean>;
}

export interface ContainerTrackingConfig {
  demurrageFreeHours?: number;
  demurrageRatePerHour?: number;
}

export class ContainerTrackingService {
  private readonly destinationWarehouseByContainer = new Map<string, string>();

  constructor(
    private readonly repository = new ContainerRepository(),
    private readonly eventPublisher?: EventPublisher,
    private readonly config: ContainerTrackingConfig = {}
  ) {}

  async createContainer(registration: ContainerRegistration): Promise<Container> {
    this.validateContainerId(registration.id);

    const initialLocation = this.createLocation('INTRN', 'In Transit');
    const createdAt = new Date();
    const journeyEvent: JourneyEvent = {
      timestamp: createdAt,
      eventType: 'container.created',
      location: initialLocation,
      transportMode: TransportMode.VESSEL,
      metadata: {
        vesselId: registration.vesselId,
        destinationWarehouse: registration.destinationWarehouse,
      },
    };

    const container: Container = {
      id: registration.id,
      ownerId: registration.ownerId,
      currentLocation: initialLocation,
      currentMode: TransportMode.VESSEL,
      status: ContainerStatus.ON_VESSEL,
      journey: [journeyEvent],
    };

    this.destinationWarehouseByContainer.set(container.id, registration.destinationWarehouse);
    return this.repository.create(container);
  }

  async updateTransportMode(
    containerId: string,
    nextMode: TransportMode,
    location: Location,
    timestamp: Date = new Date()
  ): Promise<Container> {
    this.validateLocation(location);
    const existing = this.mustGetContainer(containerId);

    const event: JourneyEvent = {
      timestamp,
      eventType: 'container.mode.changed',
      location,
      transportMode: nextMode,
      metadata: {
        fromMode: existing.currentMode,
        toMode: nextMode,
      },
    };

    const updated: Container = {
      ...existing,
      currentMode: nextMode,
      currentLocation: location,
      status: this.resolveStatus(nextMode, location),
      journey: [...existing.journey, event],
    };

    if (updated.status === ContainerStatus.AT_PORT) {
      updated.demurrageInfo = this.createOrUpdateDemurrage(updated.demurrageInfo, timestamp);
    } else if (updated.demurrageInfo) {
      updated.demurrageInfo = this.refreshDemurrage(updated.demurrageInfo, timestamp);
    }

    this.repository.update(updated);

    await this.publishEvent({
      eventId: `${updated.id}-${timestamp.getTime()}-mode`,
      eventType: 'container.mode.changed',
      timestamp,
      source: 'container-tracking',
      version: 1,
      payload: {
        containerId: updated.id,
        fromMode: existing.currentMode,
        toMode: nextMode,
        locationId: location.id,
      },
    });

    if (updated.demurrageInfo?.isPriority) {
      await this.publishEvent({
        eventId: `${updated.id}-${timestamp.getTime()}-demurrage`,
        eventType: 'demurrage.alert',
        timestamp,
        source: 'container-tracking',
        version: 1,
        payload: {
          containerId: updated.id,
          demurrageStartTime: updated.demurrageInfo.demurrageStartTime,
          freeTimeHours: updated.demurrageInfo.freeTimeHours,
        },
      });
    }

    return updated;
  }

  getContainerJourney(containerId: string): JourneyEvent[] {
    const container = this.mustGetContainer(containerId);
    return [...container.journey];
  }

  queryContainers(query: ContainerQuery): Container[] {
    return this.repository.list().filter((container) => {
      if (query.ownerId && container.ownerId !== query.ownerId) return false;
      if (query.status && container.status !== query.status) return false;
      if (query.currentMode && container.currentMode !== query.currentMode) return false;
      if (
        query.destinationWarehouse &&
        this.destinationWarehouseByContainer.get(container.id) !== query.destinationWarehouse
      ) {
        return false;
      }

      return true;
    });
  }

  async markDelivered(containerId: string, location: Location, timestamp: Date = new Date()): Promise<Container> {
    this.validateLocation(location);
    const existing = this.mustGetContainer(containerId);
    const deliveredEvent: JourneyEvent = {
      timestamp,
      eventType: 'container.delivered',
      location,
      transportMode: existing.currentMode,
      metadata: {},
    };

    const delivered: Container = {
      ...existing,
      status: ContainerStatus.DELIVERED,
      currentLocation: location,
      journey: [...existing.journey, deliveredEvent],
    };

    if (delivered.demurrageInfo) {
      delivered.demurrageInfo = this.refreshDemurrage(delivered.demurrageInfo, timestamp);
    }

    this.repository.update(delivered);

    await this.publishEvent({
      eventId: `${containerId}-${timestamp.getTime()}-delivered`,
      eventType: 'container.delivered',
      timestamp,
      source: 'container-tracking',
      version: 1,
      payload: {
        containerId,
        locationId: location.id,
      },
    });

    return delivered;
  }

  getContainer(containerId: string): Container | undefined {
    return this.repository.findById(containerId);
  }

  private mustGetContainer(containerId: string): Container {
    const container = this.repository.findById(containerId);
    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }

    return container;
  }

  private createOrUpdateDemurrage(current: DemurrageInfo | undefined, arrivalAtPort: Date): DemurrageInfo {
    if (current) {
      return this.refreshDemurrage(current, arrivalAtPort);
    }

    const freeHours = this.config.demurrageFreeHours ?? 72;
    const demurrageStart = new Date(arrivalAtPort.getTime() + freeHours * 60 * 60 * 1000);

    return {
      arrivalAtPort,
      freeTimeHours: freeHours,
      demurrageStartTime: demurrageStart,
      demurrageCost: 0,
      isPriority: freeHours <= 24,
    };
  }

  private refreshDemurrage(existing: DemurrageInfo, now: Date): DemurrageInfo {
    const hoursRemaining = (existing.demurrageStartTime.getTime() - now.getTime()) / (60 * 60 * 1000);
    const overdueHours = Math.max(0, -hoursRemaining);
    const rate = this.config.demurrageRatePerHour ?? 50;

    return {
      ...existing,
      demurrageCost: overdueHours * rate,
      isPriority: hoursRemaining > 0 && hoursRemaining < 24,
    };
  }

  private resolveStatus(mode: TransportMode, location: Location): ContainerStatus {
    if (location.type === LocationType.PORT) {
      return ContainerStatus.AT_PORT;
    }

    if (mode === TransportMode.VESSEL) return ContainerStatus.ON_VESSEL;
    if (mode === TransportMode.RAIL) return ContainerStatus.ON_RAIL;
    return ContainerStatus.ON_TRUCK;
  }

  private validateContainerId(id: string): void {
    // Simplified ISO 6346 format validation: 4 letters + 7 digits
    if (!/^[A-Z]{4}\d{7}$/.test(id)) {
      throw new Error(`Invalid ISO 6346 container ID: ${id}`);
    }
  }

  private validateLocation(location: Location): void {
    if (!/^[A-Z]{2}[A-Z0-9]{3}$/.test(location.id)) {
      throw new Error(`Invalid UN/LOCODE: ${location.id}`);
    }

    if (location.coordinates.latitude < -90 || location.coordinates.latitude > 90) {
      throw new Error('Invalid latitude');
    }

    if (location.coordinates.longitude < -180 || location.coordinates.longitude > 180) {
      throw new Error('Invalid longitude');
    }
  }

  private createLocation(id: string, name: string): Location {
    const position: Position = {
      latitude: 0,
      longitude: 0,
      timestamp: new Date(),
      speed: 0,
      heading: 0,
    };

    return {
      type: LocationType.IN_TRANSIT,
      id,
      name,
      coordinates: position,
    };
  }

  private async publishEvent(event: DomainEvent): Promise<void> {
    if (!this.eventPublisher) return;
    await this.eventPublisher.publish(event);
  }
}
