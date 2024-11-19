import { AppLogsCommand } from './commands/app-logs-init';
import { RuntipiLogsCommand } from './commands/runtipi-logs-init';
import type { DockerCommand } from './commands/type';
import type { DockerService } from './docker.service';

export class DockerCommandFactory {
  constructor(private readonly dockerService: DockerService) {}

  createCommand(event: string): DockerCommand | null {
    switch (event) {
      case 'app-logs-init':
        return new AppLogsCommand(this.dockerService);
      case 'runtipi-logs-init':
        return new RuntipiLogsCommand(this.dockerService);
      default:
        return null;
    }
  }
}
