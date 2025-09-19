import { type } from 'arktype';
import { createArkDto } from 'nestjs-arktype';

const backupSchema = type({
  id: 'string',
  size: 'number',
  date: 'number',
});

const restoreAppBackupSchema = type({
  filename: 'string',
});

const getAppBackupsSchema = type({
  data: backupSchema.array(),
  total: 'number',
  currentPage: 'number',
  lastPage: 'number',
});

const getAppBackupsQuerySchema = type({
  page: type('number.integer | string.integer.parse').to('number').optional(),
  pageSize: type('number.integer | string.integer.parse').to('number').optional(),
});

const deleteAppBackupBodySchema = type({
  filename: 'string',
});

const backupRequestSchema = type({
  requestId: 'string.uuid',
});

export class BackupDto extends createArkDto(backupSchema, { name: 'BackupDto' }) {}
export class RestoreAppBackupDto extends createArkDto(restoreAppBackupSchema, { name: 'RestoreAppBackupDto', input: true }) {}
export class GetAppBackupsDto extends createArkDto(getAppBackupsSchema, { name: 'GetAppBackupsDto' }) {}
export class GetAppBackupsQueryDto extends createArkDto(getAppBackupsQuerySchema, { name: 'GetAppBackupsQueryDto', input: true }) {}
export class DeleteAppBackupBodyDto extends createArkDto(deleteAppBackupBodySchema, { name: 'DeleteAppBackupBodyDto', input: true }) {}
export class BackupRequestDto extends createArkDto(backupRequestSchema, { name: 'BackupRequestDto' }) {}
