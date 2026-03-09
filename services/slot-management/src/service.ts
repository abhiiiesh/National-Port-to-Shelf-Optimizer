import {
  ArrivalPrediction,
  CapacityInfo,
  DomainEvent,
  Reservation,
  ReservationStatus,
  SlotCreationRequest,
  TransportMode,
} from '@port-to-shelf/shared-types';
import { ReservationRepository, SlotRepository } from './repository';

export interface ManagedSlot {
  id: string;
  vesselId: string;
  portId: string;
  mode: TransportMode;
  origin: string;
  destination: string;
  departureTime: Date;
  capacity: number;
  reserved: number;
  priorityScore: number;
}

export interface EventPublisher {
  publish(event: DomainEvent): Promise<boolean>;
}

export interface EventSubscriber {
  subscribe(topic: string, consumerGroup: string, handler: (event: DomainEvent) => Promise<void>): unknown;
}

export class SlotManagementService {
  private readonly capacityByModeRoute = new Map<string, CapacityInfo>();

  constructor(
    private readonly slotRepository = new SlotRepository(),
    private readonly reservationRepository = new ReservationRepository(),
    private readonly eventPublisher?: EventPublisher
  ) {}

  updateCapacity(capacity: CapacityInfo): CapacityInfo {
    const key = this.capacityKey(capacity.mode, capacity.route.origin, capacity.route.destination);
    this.capacityByModeRoute.set(key, capacity);
    return capacity;
  }

  getAvailableCapacity(mode: TransportMode, origin: string, destination: string): number {
    const cap = this.capacityByModeRoute.get(this.capacityKey(mode, origin, destination));
    return cap?.availableCapacity ?? 0;
  }

  createSlots(request: SlotCreationRequest, options?: { highPriorityContainers?: number }): ManagedSlot[] {
    if (request.containerCount <= 0) {
      return [];
    }

    const highPriority = options?.highPriorityContainers ?? 0;
    const perDestination = Math.max(1, Math.ceil(request.containerCount / Math.max(1, request.destinations.length)));

    return request.destinations.map((destination, idx) => {
      const mode = idx % 2 === 0 ? TransportMode.RAIL : TransportMode.TRUCK;
      const availableCapacity = this.getAvailableCapacity(mode, request.portId, destination);
      const capacity = Math.min(perDestination, availableCapacity);

      const slot: ManagedSlot = {
        id: `slot-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
        vesselId: request.vesselId,
        portId: request.portId,
        mode,
        origin: request.portId,
        destination,
        departureTime: new Date(request.predictedArrival.getTime() + (idx + 1) * 60 * 60 * 1000),
        capacity,
        reserved: 0,
        priorityScore: highPriority > 0 ? 100 : 10,
      };

      this.slotRepository.create(slot);
      return slot;
    });
  }

  async reserveSlot(slotId: string, containerId: string, ttlMinutes = 60): Promise<Reservation> {
    const slot = this.mustGetSlot(slotId);
    if (slot.capacity <= 0) {
      throw new Error(`Slot ${slot.id} has zero capacity`);
    }

    if (slot.reserved >= slot.capacity) {
      throw new Error(`Slot ${slot.id} has no available capacity`);
    }

    slot.reserved += 1;
    this.slotRepository.update(slot);

    this.consumeCapacity(slot.mode, slot.origin, slot.destination, 1);

    const now = new Date();
    const reservation: Reservation = {
      id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      slotId: slot.id,
      containerId,
      status: ReservationStatus.RESERVED,
      createdAt: now,
      expiresAt: new Date(now.getTime() + ttlMinutes * 60 * 1000),
    };

    this.reservationRepository.create(reservation);

    await this.publishEvent({
      eventId: `${reservation.id}-slot-reserved`,
      eventType: 'slot.reserved',
      timestamp: now,
      source: 'slot-management',
      version: 1,
      payload: {
        slotId: slot.id,
        containerId,
        reservationId: reservation.id,
      },
    });

    return reservation;
  }

  releaseSlot(reservationId: string): Reservation {
    const reservation = this.reservationRepository.findById(reservationId);
    if (!reservation) {
      throw new Error(`Reservation ${reservationId} not found`);
    }

    const slot = this.mustGetSlot(reservation.slotId);

    if (reservation.status === ReservationStatus.RESERVED || reservation.status === ReservationStatus.EXPIRED) {
      slot.reserved = Math.max(0, slot.reserved - 1);
      this.slotRepository.update(slot);
      this.restoreCapacity(slot.mode, slot.origin, slot.destination, 1);
    }

    const updated: Reservation = {
      ...reservation,
      status: ReservationStatus.CANCELLED,
    };

    return this.reservationRepository.update(updated);
  }

  expireReservation(reservationId: string): Reservation {
    const reservation = this.reservationRepository.findById(reservationId);
    if (!reservation) {
      throw new Error(`Reservation ${reservationId} not found`);
    }

    const slot = this.mustGetSlot(reservation.slotId);
    if (reservation.status === ReservationStatus.RESERVED) {
      slot.reserved = Math.max(0, slot.reserved - 1);
      this.slotRepository.update(slot);
      this.restoreCapacity(slot.mode, slot.origin, slot.destination, 1);
    }

    return this.reservationRepository.update({
      ...reservation,
      status: ReservationStatus.EXPIRED,
    });
  }

  listSlots(): ManagedSlot[] {
    return this.slotRepository.list();
  }

  bindToEventBus(subscriber: EventSubscriber): void {
    subscriber.subscribe('prediction.generated', 'slot-management-service', async (event) => {
      const payload = event.payload as { vesselId: string; portId?: string; containerCount?: number; destinations?: string[] };
      this.createSlots({
        vesselId: payload.vesselId,
        portId: payload.portId ?? 'UNKNOWN',
        predictedArrival: event.timestamp,
        containerCount: payload.containerCount ?? 1,
        destinations: payload.destinations ?? ['UNKNOWN'],
      });
    });
  }

  createSlotsFromPrediction(prediction: ArrivalPrediction, destinations: string[], containerCount: number): ManagedSlot[] {
    return this.createSlots({
      vesselId: prediction.vesselId,
      portId: prediction.portId,
      predictedArrival: prediction.predictedArrivalTime,
      containerCount,
      destinations,
    });
  }

  private mustGetSlot(slotId: string): ManagedSlot {
    const slot = this.slotRepository.findById(slotId);
    if (!slot) {
      throw new Error(`Slot ${slotId} not found`);
    }

    return slot;
  }

  private consumeCapacity(mode: TransportMode, origin: string, destination: string, units: number): void {
    const key = this.capacityKey(mode, origin, destination);
    const cap = this.capacityByModeRoute.get(key);
    if (!cap) return;

    const nextAvailable = Math.max(0, cap.availableCapacity - units);
    const nextReserved = cap.reservedCapacity + units;
    this.capacityByModeRoute.set(key, {
      ...cap,
      availableCapacity: nextAvailable,
      reservedCapacity: nextReserved,
      utilizationRate: cap.totalCapacity > 0 ? nextReserved / cap.totalCapacity : 0,
    });
  }

  private restoreCapacity(mode: TransportMode, origin: string, destination: string, units: number): void {
    const key = this.capacityKey(mode, origin, destination);
    const cap = this.capacityByModeRoute.get(key);
    if (!cap) return;

    const nextAvailable = Math.min(cap.totalCapacity, cap.availableCapacity + units);
    const nextReserved = Math.max(0, cap.reservedCapacity - units);
    this.capacityByModeRoute.set(key, {
      ...cap,
      availableCapacity: nextAvailable,
      reservedCapacity: nextReserved,
      utilizationRate: cap.totalCapacity > 0 ? nextReserved / cap.totalCapacity : 0,
    });
  }

  private capacityKey(mode: TransportMode, origin: string, destination: string): string {
    return `${mode}:${origin}->${destination}`;
  }

  private async publishEvent(event: DomainEvent): Promise<void> {
    if (!this.eventPublisher) return;
    await this.eventPublisher.publish(event);
  }
}
