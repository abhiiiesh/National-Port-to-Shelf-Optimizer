import { Container, JourneyEvent } from '@port-to-shelf/shared-types';

export interface ContainerRepositoryBackup {
  containers: Container[];
  journeyEvents: Array<{ containerId: string; events: JourneyEvent[] }>;
}

export class ContainerRepository {
  private readonly containers = new Map<string, Container>();
  private readonly journeyEvents = new Map<string, JourneyEvent[]>();

  create(container: Container): Container {
    if (this.containers.has(container.id)) {
      throw new Error(`Container ${container.id} already exists`);
    }

    this.containers.set(container.id, container);
    this.journeyEvents.set(container.id, [...container.journey]);
    return container;
  }

  update(container: Container): Container {
    if (!this.containers.has(container.id)) {
      throw new Error(`Container ${container.id} not found`);
    }

    this.containers.set(container.id, container);
    return container;
  }

  persistJourneyEvent(containerId: string, event: JourneyEvent): void {
    const current = this.journeyEvents.get(containerId) ?? [];
    this.journeyEvents.set(containerId, [...current, event]);
  }

  listJourneyEvents(containerId: string): JourneyEvent[] {
    return [...(this.journeyEvents.get(containerId) ?? [])];
  }

  findById(id: string): Container | undefined {
    return this.containers.get(id);
  }

  list(): Container[] {
    return Array.from(this.containers.values());
  }

  executeTransaction<T>(operation: () => T): T {
    const containerSnapshot = new Map(this.containers);
    const journeySnapshot = new Map<string, JourneyEvent[]>();
    this.journeyEvents.forEach((events, containerId) => {
      journeySnapshot.set(containerId, [...events]);
    });

    try {
      return operation();
    } catch (error) {
      this.containers.clear();
      containerSnapshot.forEach((container, id) => this.containers.set(id, container));

      this.journeyEvents.clear();
      journeySnapshot.forEach((events, id) => this.journeyEvents.set(id, events));
      throw error;
    }
  }

  createBackup(): ContainerRepositoryBackup {
    return {
      containers: this.list().map((container) => ({ ...container, journey: [...container.journey] })),
      journeyEvents: Array.from(this.journeyEvents.entries()).map(([containerId, events]) => ({
        containerId,
        events: [...events],
      })),
    };
  }

  restoreBackup(snapshot: ContainerRepositoryBackup): void {
    this.containers.clear();
    snapshot.containers.forEach((container) => this.containers.set(container.id, { ...container, journey: [...container.journey] }));

    this.journeyEvents.clear();
    snapshot.journeyEvents.forEach(({ containerId, events }) => {
      this.journeyEvents.set(containerId, [...events]);
    });
  }
}
