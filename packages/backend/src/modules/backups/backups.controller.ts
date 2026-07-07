import { castAppUrn } from '@/common/helpers/app-helpers';
import { sanitizeFilename } from '@/common/helpers/file-helpers';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { AppLifecycleService } from '../app-lifecycle/app-lifecycle.service';
import { AuthGuard } from '../auth/auth.guard';
import { BackupsService } from './backups.service';
import { BackupRequestDto, DeleteAppBackupBodyDto, GetAppBackupsDto, GetAppBackupsQueryDto, RestoreAppBackupDto } from './dto/backups.dto';

@Injectable()
@UseGuards(AuthGuard)
@Controller('backups')
export class BackupsController {
  constructor(
    private readonly backupsService: BackupsService,
    private readonly appLifecycleService: AppLifecycleService,
  ) {}

  @Post(':urn/backup')
  @ApiResponse({ type: BackupRequestDto })
  async backupApp(@Param('urn') urn: string) {
    const res = await this.appLifecycleService.backupApp({ appUrn: castAppUrn(urn) });
    return BackupRequestDto.parse(res, { reportOnly: true });
  }

  @Post(':urn/restore')
  @ApiResponse({ type: BackupRequestDto })
  async restoreAppBackup(@Param('urn') urn: string, @Body() body: RestoreAppBackupDto) {
    const sanitizedFilename = sanitizeFilename(body.filename);

    if (sanitizedFilename !== body.filename || !sanitizedFilename.endsWith('.tar.gz')) {
      throw new BadRequestException('Invalid backup filename');
    }

    const res = await this.appLifecycleService.restoreApp({ appUrn: castAppUrn(urn), filename: sanitizedFilename });
    return BackupRequestDto.parse(res, { reportOnly: true });
  }

  @Get(':urn')
  @ApiResponse({ type: GetAppBackupsDto })
  async getAppBackups(@Param('urn') urn: string, @Query() query: GetAppBackupsQueryDto) {
    const backups = await this.backupsService.getAppBackups({ appUrn: castAppUrn(urn), page: query.page ?? 0, pageSize: query.pageSize ?? 10 });

    return GetAppBackupsDto.parse(backups, { reportOnly: true });
  }

  @Delete(':urn')
  async deleteAppBackup(@Param('urn') urn: string, @Body() body: DeleteAppBackupBodyDto) {
    const sanitizedFilename = sanitizeFilename(body.filename);

    if (sanitizedFilename !== body.filename || !sanitizedFilename.endsWith('.tar.gz')) {
      throw new BadRequestException('Invalid backup filename');
    }

    return this.backupsService.deleteAppBackup({ appUrn: castAppUrn(urn), filename: sanitizedFilename });
  }

  @Get(':urn/:filename/download')
  @ApiResponse({ status: 200, description: 'Backup file download' })
  async downloadBackup(@Param('urn') urn: string, @Param('filename') filename: string, @Res() res: Response) {
    const sanitizedFilename = sanitizeFilename(filename);

    if (sanitizedFilename !== filename || !sanitizedFilename.endsWith('.tar.gz')) {
      throw new BadRequestException('Invalid backup filename');
    }

    const filePath = await this.backupsService.getBackupFilePath({ appUrn: castAppUrn(urn), filename: sanitizedFilename });

    res.set({
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    return res.sendFile(filePath);
  }

  @Post(':urn/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Backup uploaded successfully' })
  async uploadBackup(@Param('urn') urn: string, @UploadedFile() file?: { buffer: Buffer; originalname: string; mimetype: string }) {
    if (!file) {
      throw new BadRequestException('No backup file provided');
    }

    const sanitizedFilename = sanitizeFilename(file.originalname);

    if (sanitizedFilename !== file.originalname) {
      throw new BadRequestException('Invalid backup filename');
    }

    if (!sanitizedFilename.endsWith('.tar.gz') && file.mimetype !== 'application/gzip' && file.mimetype !== 'application/x-gzip') {
      throw new BadRequestException('File must be a .tar.gz backup file');
    }

    await this.backupsService.uploadBackup({
      appUrn: castAppUrn(urn),
      filename: sanitizedFilename,
      fileBuffer: file.buffer,
    });

    return { success: true };
  }
}
