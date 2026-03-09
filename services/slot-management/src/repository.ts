import { Reservation } from '@port-to-shelf/shared-types';
import { ManagedSlot } from './service';

export class SlotRepository {
  private readonly slots = new Map<string, ManagedSlot>();

  create(slot: ManagedSlot): ManagedSlot {
    this.slots.set(slot.id, slot);
    return slot;
  }

  update(slot: ManagedSlot): ManagedSlot {
    if (!this.slots.has(slot.id)) {
      throw new Error(`Slot ${slot.id} not found`);
    }

    this.slots.set(slot.id, slot);
    return slot;
  }

  findById(id: string): ManagedSlot | undefined {
    return this.slots.get(id);
  }

  list(): ManagedSlot[] {
    return Array.from(this.slots.values());
  }
}

export class ReservationRepository {
  private readonly reservations = new Map<string, Reservation>();

  create(reservation: Reservation): Reservation {
    this.reservations.set(reservation.id, reservation);
    return reservation;
  }

  update(reservation: Reservation): Reservation {
    if (!this.reservations.has(reservation.id)) {
      throw new Error(`Reservation ${reservation.id} not found`);
    }

    this.reservations.set(reservation.id, reservation);
    return reservation;
  }

  listBySlot(slotId: string): Reservation[] {
    return Array.from(this.reservations.values()).filter((reservation) => reservation.slotId === slotId);
  }

  findById(id: string): Reservation | undefined {
    return this.reservations.get(id);
  }
}
