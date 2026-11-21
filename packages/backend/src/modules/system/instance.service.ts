import { Injectable } from '@nestjs/common';
import { ConfigurationService } from '@/core/config/configuration.service';
import { GithubService } from '@/utils/github/github.service';
import { UserRepository } from '@/modules/user/user.repository';

@Injectable()
export class InstanceService {
  constructor(
    private readonly config: ConfigurationService,
    private readonly github: GithubService,
    private readonly users: UserRepository,
  ) {}

  async getVersion() {
    const { version: current } = this.config.getConfig();
    const [latest, releases] = await Promise.all([
      this.github.getLatestRelease('runtipi', 'runtipi'),
      this.github.getReleasesSince('runtipi', 'runtipi', current),
    ]);

    return { current, latest: latest?.version || current, body: latest?.body ?? '', releases };
  }

  async acknowledgeWelcome(userId: number, allowErrorMonitoring: boolean) {
    await this.config.initSentry({ release: this.config.get('version'), allowSentry: allowErrorMonitoring });
    await this.users.updateUser(userId, { hasSeenWelcome: true });
    if (!this.config.get('demoMode')) await this.config.setUserSettings({ allowErrorMonitoring });
  }
}
