import { DockerService } from '@/modules/docker/docker.service';
import { colorizeLogs } from '@/modules/docker/helpers/colorize-logs';
import { Injectable, type MessageEvent } from '@nestjs/common';
import type { SSE, Topic } from '@runtipi/common/schemas';
import type { AppUrn } from '@runtipi/common/types';
import { Observable, Subject, interval } from 'rxjs';
import { LoggerService } from '../logger/logger.service';

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
  emit<T extends Topic>(topic: T, data: Extract<SSE, { topic: T }>['data'], appUrn?: AppUrn) {
    let formattedTopic = topic;

    if (appUrn) {
      // We want to use this topic for a specific app
      formattedTopic = `${topic}:${appUrn}` as T;
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
  getTopicObservable(topic: Topic, appUrn?: AppUrn): Observable<MessageEvent> {
    let formattedTopic = topic;

    if (appUrn) {
      // We want to use this topic for a specific app
      formattedTopic = `${topic}:${appUrn}` as Topic;
    }

    let currentTopic = this.topics.get(formattedTopic);
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
  async getLogStreamObservable(topic: Topic, maxLines: number, appUrn?: AppUrn): Promise<Observable<MessageEvent>> {
    const { on, kill } = await this.dockerService.getLogsStream(maxLines, appUrn);

    return new Observable((subscriber) => {
      const observable = this.getTopicObservable(topic, appUrn);

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

          const payload = appUrn ? { appUrn, lines, event: 'newLogs' as const } : { lines, event: 'newLogs' as const };
          this.emit(topic, payload, appUrn);
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
