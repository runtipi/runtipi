import { ICommand } from './types';
import fs from 'fs';
import { DATA_DIR } from '@/config/constants';
import path from 'path';
import { pathExists } from 'fs-extra';

type ReturnValue = Awaited<ReturnType<InstanceType<typeof GetAppBackups>['execute']>>;

export class GetAppBackups implements ICommand<ReturnValue> {
  private appId: string;

  constructor(params: { appId: string }) {
    this.appId = params.appId;
  }

  async execute() {
    const backupsRootDir = path.join(DATA_DIR, 'backups', this.appId);

    if (!(await pathExists(backupsRootDir))) {
      return [];
    }

    const files = await fs.promises.readdir(path.join(DATA_DIR, 'backups', this.appId));
    const backups: string[] = [];

    for (const file in files) {
      if (files[file]!.includes('.tar.gz')) {
        backups.push(files[file]!);
      }
    }

    return backups;
  }
}
