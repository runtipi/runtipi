import { BaseAppSource } from './base-app-source';
import type { AppSource } from './app-source.interface';

export class InstalledAppSource extends BaseAppSource implements AppSource {
  protected getBaseDir() {
    return this.appPaths.getAppInstalledDir(this.appUrn);
  }
}
