import { ConfigurationService } from '@/core/config/configuration.service';
import { LoggerService } from '@/core/logger/logger.service';
import { Injectable } from '@nestjs/common';
import { RepoEventsQueue } from '../queue/entities/repo-events';
import { ReposHelpers } from './repos.helpers';

@Injectable()
export class ReposService {
  constructor(
    private readonly logger: LoggerService,
    private readonly repoQueue: RepoEventsQueue,
    private readonly repoHelpers: ReposHelpers,
    private readonly config: ConfigurationService,
  ) {
    this.repoQueue.onEvent(async ({ eventId, command, url }) => {
      switch (command) {
        case 'clone': {
          const { success, message } = await this.repoHelpers.cloneRepo(url);
          this.repoQueue.sendEventResponse(eventId, { success, message });
          break;
        }
        case 'update': {
          const { success, message } = await this.repoHelpers.pullRepo(url);
          this.repoQueue.sendEventResponse(eventId, { success, message });
          break;
        }
        default:
          this.logger.error(`Unknown command: ${command}`);
      }
    });
  }

  public async pullRepositories() {
    const appsRepoUrl = this.config.get('appsRepoUrl');
    await this.repoHelpers.pullRepo(appsRepoUrl);
    return { success: true };
  }
}
