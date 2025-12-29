import { type } from 'arktype';
import { createArkDto } from 'nestjs-arktype';

const event = type({
  requestId: 'string',
  expiration: 'number',
  timestamp: 'number',
  queueName: 'string',
  caller: 'string',
});

const events = type({
  events: event.array().default(() => []),
});

// Events
export class EventsDto extends createArkDto(events, { name: 'EventsDto' }) {}

// Types
export type EventsType = typeof events.infer;
export type EventType = typeof event.infer;
