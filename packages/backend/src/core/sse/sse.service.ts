import { DockerService } from '@/modules/docker/docker.service';
import { colorizeLogs } from '@/modules/docker/helpers/colorize-logs';
import { Injectable, type MessageEvent } from '@nestjs/common';
import { Observable, Subject, interval } from 'rxjs';
import { LoggerService } from '../logger/logger.service';
import type { SSE, Topic } from './dto/sse.dto';

@Injectable()
export class SSEService {
  constructor(
    private readonly logger: LoggerService,
    private readonly dockerService: DockerService,
  ) {
    // Kill all topics with no subscribers
    interval(1000 * 60).subscribe(() => {
      this.topics.forEach((topic, key) => {
        if (!topic.observed) {
          this.logger.debug(`Killing topic ${key}`);
          topic.complete();
          this.topics.delete(key);
        }
      });
    });
  }

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

  /**
   * Creates an observable for logs stream.
   * It listens to the logs stream and emits the logs to the specified topic.
   */
  async getLogStreamObservable(topic: Topic, maxLines: number, appId?: string): Promise<Observable<MessageEvent>> {
    const { on, kill } = await this.dockerService.getLogsStream(maxLines, appId);

    return new Observable((subscriber) => {
      const observable = this.getTopicObservable(topic, appId);

      const subscription = observable.subscribe({
        next: (event) => subscriber.next(event),
        error: (err) => subscriber.error(err),
        complete: () => subscriber.complete(),
      });

      on('data', async (data) => {
        let lines: string[] = [];

        try {
          lines = await colorizeLogs(
            data
              .toString()
              .split(/(?:\r\n|\r|\n)/g)
              .filter(Boolean),
          );

          const payload = appId ? { appId, lines, event: 'newLogs' as const } : { lines, event: 'newLogs' as const };
          this.emit(topic, payload, appId);
        } catch (error) {
          this.logger.error(`Error colorizing logs: ${error}`);
        }
      });

      return () => {
        kill();
        subscription.unsubscribe();
      };
    });
  }
}
