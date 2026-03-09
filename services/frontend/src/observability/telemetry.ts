export type TelemetryEventType =
  | 'PAGE_LOAD'
  | 'ROUTE_TRANSITION'
  | 'INTERACTION'
  | 'FRONTEND_ERROR'
  | 'BUSINESS_EVENT';

export interface TelemetryEvent {
  type: TelemetryEventType;
  name: string;
  durationMs?: number;
  route?: string;
  releaseVersion: string;
  metadata?: Record<string, string | number | boolean>;
  occurredAtIso: string;
}

export interface FrontendTelemetryStore {
  record(event: TelemetryEvent): void;
  list(): TelemetryEvent[];
  clear(): void;
}

export class InMemoryTelemetryStore implements FrontendTelemetryStore {
  private readonly events: TelemetryEvent[] = [];

  record(event: TelemetryEvent): void {
    this.events.push(event);
  }

  list(): TelemetryEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events.length = 0;
  }
}

export const createTelemetryEvent = (
  type: TelemetryEventType,
  name: string,
  releaseVersion: string,
  overrides: Partial<Omit<TelemetryEvent, 'type' | 'name' | 'releaseVersion'>> = {}
): TelemetryEvent => ({
  type,
  name,
  releaseVersion,
  occurredAtIso: new Date().toISOString(),
  ...overrides,
});
