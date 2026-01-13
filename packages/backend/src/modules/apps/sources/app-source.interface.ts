import type { AppInfo, DynamicComposeSchemaYaml } from '@runtipi/common/schemas';
import type { AppUrn } from '@runtipi/common/types';

export interface AppSource {
  getAppUrn(): AppUrn;
  getAppInfo(): Promise<AppInfo | null>;
  getCompose(): Promise<DynamicComposeSchemaYaml | null>;
  getLogo(): Promise<{ image: Buffer; etag: string } | null>;
  getDescription(): Promise<string | null>;
  hasDataDir(): Promise<boolean>;
}
