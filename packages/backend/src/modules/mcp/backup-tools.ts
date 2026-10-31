import { Injectable } from '@nestjs/common';
import { type } from 'arktype';
import { castAppUrn } from '@/common/helpers/app-helpers';
import { AppLifecycleService } from '@/modules/app-lifecycle/app-lifecycle.service';
import { BackupsService } from '@/modules/backups/backups.service';
import type { AgentIdentity } from '@/modules/agent-credentials/agent-credentials.service';
import { McpOperationsService } from './mcp-operations.service';
import { ToolRegistry } from './tool-registry';
import { validateBackupFilename } from './transfer-validation';
import { urnSchema, appInput, backupInput, toolOutputs } from './tool-contracts';

@Injectable()
export class McpBackupTools {
  constructor(
    private readonly backups: BackupsService,
    private readonly lifecycle: AppLifecycleService,
    private readonly operations: McpOperationsService,
  ) {}

  register(tools: ToolRegistry, identity: AgentIdentity) {
    tools.add(
      'list_backups',
      'List app backups.',
      type({ urn: urnSchema, page: 'number.integer >= 1 = 1', pageSize: '1 <= number.integer <= 100 = 10' }),
      toolOutputs.list_backups,
      ({ urn, page, pageSize }) => this.backups.getAppBackups({ appUrn: castAppUrn(urn), page, pageSize }),
      true,
    );

    tools.add('delete_backup', 'Permanently delete an app backup.', backupInput, toolOutputs.delete_backup, async ({ urn, filename }) => {
      await this.lifecycle.deleteAppBackup({ appUrn: castAppUrn(urn), filename: validateBackupFilename(filename) });
      return { success: true };
    });

    tools.add(
      'get_backup_transfer',
      'Get an authenticated backup download or streaming upload path. Upload raw gzip bytes with Content-Type application/gzip and the same bearer header.',
      type({ urn: urnSchema, filename: 'string', direction: "'upload' | 'download'" }),
      toolOutputs.get_backup_transfer,
      ({ urn, filename, direction }) => {
        const appUrn = castAppUrn(urn);
        validateBackupFilename(filename);
        return {
          method: direction === 'upload' ? 'PUT' : 'GET',
          path: `/api/mcp/transfers/backups/${encodeURIComponent(appUrn)}/${encodeURIComponent(filename)}`,
          authorization: 'Use the same Authorization bearer header as the MCP endpoint',
          contentType: 'application/gzip',
        };
      },
      true,
    );

    tools.add(
      'get_logo_upload',
      'Get an authenticated multipart JPG logo upload path (field image, maximum 5 MiB).',
      appInput,
      toolOutputs.get_logo_upload,
      ({ urn }) => ({
        method: 'POST',
        path: `/api/mcp/transfers/images/${encodeURIComponent(castAppUrn(urn))}`,
        authorization: 'Use the same Authorization bearer header as the MCP endpoint',
        maxUploadBytes: 5 * 1024 * 1024,
      }),
      true,
    );
    tools.add('backup_app', 'Create an app backup. Returns an accepted cancellable job.', appInput, toolOutputs.backup_app, ({ urn }) =>
      this.operations.start(identity, castAppUrn(urn), 'backup', () => this.lifecycle.backupApp({ appUrn: castAppUrn(urn) })),
    );

    tools.add('restore_backup', 'Restore an app backup, replacing current app data.', backupInput, toolOutputs.restore_backup, ({ urn, filename }) =>
      this.operations.start(identity, castAppUrn(urn), 'restore', () =>
        this.lifecycle.restoreApp({ appUrn: castAppUrn(urn), filename: validateBackupFilename(filename) }),
      ),
    );
  }
}
