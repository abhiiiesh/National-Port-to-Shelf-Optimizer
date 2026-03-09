import { Container } from '@port-to-shelf/shared-types';

export class ContainerRepository {
  private readonly containers = new Map<string, Container>();

  create(container: Container): Container {
    if (this.containers.has(container.id)) {
      throw new Error(`Container ${container.id} already exists`);
    }

    this.containers.set(container.id, container);
    return container;
  }

  update(container: Container): Container {
    if (!this.containers.has(container.id)) {
      throw new Error(`Container ${container.id} not found`);
    }

    this.containers.set(container.id, container);
    return container;
  }

  findById(id: string): Container | undefined {
    return this.containers.get(id);
  }

  list(): Container[] {
    return Array.from(this.containers.values());
  }
}
