import { deserializeEvent, DomainEvent, DomainEventType, serializeEvent } from '@port-to-shelf/shared-types';

export interface EventSchema {
  eventType: DomainEventType;
  version: number;
  validate: (payload: unknown) => boolean;
}

export interface EventSubscription {
  subscriptionId: string;
  topic: string;
  consumerGroup: string;
}

type EventHandler = (event: DomainEvent) => Promise<void>;

interface GroupSubscribers {
  ids: string[];
  handlers: Map<string, EventHandler>;
  nextIndex: number;
}

export class EventSchemaRegistry {
  private readonly schemas = new Map<string, EventSchema>();

  register(schema: EventSchema): void {
    this.schemas.set(this.key(schema.eventType, schema.version), schema);
  }

  validate(event: DomainEvent): boolean {
    const schema = this.schemas.get(this.key(event.eventType, event.version));
    if (!schema) {
      return true;
    }

    return schema.validate(event.payload);
  }

  private key(eventType: DomainEventType, version: number): string {
    return `${eventType}:v${version}`;
  }
}

export class InMemoryEventBus {
  private readonly topics = new Map<string, string[]>();
  private readonly processedEventIds = new Set<string>();
  private readonly subscribersByTopic = new Map<string, Map<string, GroupSubscribers>>();
  private subscriptionCounter = 0;

  constructor(private readonly registry = new EventSchemaRegistry()) {}

  configureTopics(eventTypes: DomainEventType[]): void {
    eventTypes.forEach((eventType) => {
      if (!this.topics.has(eventType)) {
        this.topics.set(eventType, []);
      }
    });
  }

  async publish(event: DomainEvent): Promise<boolean> {
    if (this.processedEventIds.has(event.eventId)) {
      return false;
    }

    if (!this.registry.validate(event)) {
      throw new Error(`Schema validation failed for event type ${event.eventType}`);
    }

    if (!this.topics.has(event.eventType)) {
      this.topics.set(event.eventType, []);
    }

    const serialized = serializeEvent(event);
    this.topics.get(event.eventType)?.push(serialized);
    this.processedEventIds.add(event.eventId);

    await this.dispatchToSubscriberGroups(event.eventType, event);

    return true;
  }

  subscribe(topic: string, consumerGroup: string, handler: EventHandler): EventSubscription {
    const subscriptionId = `sub-${++this.subscriptionCounter}`;
    const groups = this.subscribersByTopic.get(topic) ?? new Map<string, GroupSubscribers>();
    const group =
      groups.get(consumerGroup) ??
      ({
        ids: [],
        handlers: new Map<string, EventHandler>(),
        nextIndex: 0,
      } satisfies GroupSubscribers);

    group.ids.push(subscriptionId);
    group.handlers.set(subscriptionId, handler);
    groups.set(consumerGroup, group);
    this.subscribersByTopic.set(topic, groups);

    return { subscriptionId, topic, consumerGroup };
  }

  getEvents(topic: string): DomainEvent[] {
    const events = this.topics.get(topic) ?? [];
    return events.map((event) => deserializeEvent(event));
  }

  private async dispatchToSubscriberGroups(topic: string, event: DomainEvent): Promise<void> {
    const groups = this.subscribersByTopic.get(topic);
    if (!groups) {
      return;
    }

    for (const group of groups.values()) {
      const selected = group.ids[group.nextIndex % group.ids.length];
      group.nextIndex = (group.nextIndex + 1) % group.ids.length;
      const handler = group.handlers.get(selected);
      if (handler) {
        await handler(event);
      }
    }
  }
}
