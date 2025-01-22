import { Injectable, type MessageEvent } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { LoggerService } from '../logger/logger.service';
import type { SSE, Topic } from './dto/sse.dto';

@Injectable()
export class SSEService {
  constructor(private readonly logger: LoggerService) {}

  private topics: Map<Topic, Subject<MessageEvent>> = new Map();

  /**
   * Emits an event to the specified topic.
   */
  emit<T extends Topic>(topic: T, data: Extract<SSE, { topic: T }>['data'], appId?: string) {
    let formattedTopic = topic;

    if (appId) {
      // We want to use this topic for a specific app
      formattedTopic = `${topic}:${appId}` as T;
    }

    let currentTopic = this.topics.get(formattedTopic);
    if (!currentTopic) {
      currentTopic = new Subject<MessageEvent>();
      this.topics.set(formattedTopic, currentTopic);
    }

    const event = new MessageEvent('message', { data: JSON.stringify(data) });

    currentTopic.next(event);
  }

  /**
   * Gets an observable for the specified topic.
   * If the topic does not exist, it creates it.
   */
  getTopicObservable(topic: Topic, appId?: string): Observable<MessageEvent> {
    let formattedTopic = topic;

    if (appId) {
      // We want to use this topic for a specific app
      formattedTopic = `${topic}:${appId}` as Topic;
    }

    let currentTopic = this.topics.get(topic);
    if (!currentTopic) {
      currentTopic = new Subject<MessageEvent>();
      this.topics.set(formattedTopic, currentTopic);
    }

    return currentTopic.asObservable();
  }
}
