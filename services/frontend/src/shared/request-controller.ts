export class RequestControllerRegistry {
  private readonly controllers = new Map<string, AbortController>();

  createForKey(key: string): AbortSignal {
    this.abortForKey(key);
    const controller = new AbortController();
    this.controllers.set(key, controller);
    return controller.signal;
  }

  abortForKey(key: string): void {
    const current = this.controllers.get(key);
    if (current) {
      current.abort();
      this.controllers.delete(key);
    }
  }

  abortAll(): void {
    this.controllers.forEach((controller) => controller.abort());
    this.controllers.clear();
  }

  activeCount(): number {
    return this.controllers.size;
  }
}
