import { Vessel } from '@port-to-shelf/shared-types';

export class VesselRepository {
  private readonly vesselsById = new Map<string, Vessel>();
  private readonly vesselIdByImo = new Map<string, string>();

  create(vessel: Vessel): Vessel {
    if (this.vesselIdByImo.has(vessel.imoNumber)) {
      throw new Error(`Vessel with IMO ${vessel.imoNumber} already exists`);
    }

    this.vesselsById.set(vessel.id, vessel);
    this.vesselIdByImo.set(vessel.imoNumber, vessel.id);
    return vessel;
  }

  update(vessel: Vessel): Vessel {
    if (!this.vesselsById.has(vessel.id)) {
      throw new Error(`Vessel ${vessel.id} not found`);
    }

    this.vesselsById.set(vessel.id, vessel);
    return vessel;
  }

  findById(id: string): Vessel | undefined {
    return this.vesselsById.get(id);
  }

  findByImoNumber(imoNumber: string): Vessel | undefined {
    const id = this.vesselIdByImo.get(imoNumber);
    return id ? this.vesselsById.get(id) : undefined;
  }

  list(): Vessel[] {
    return Array.from(this.vesselsById.values());
  }
}
