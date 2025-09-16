import { castAppUrn } from '@/common/helpers/app-helpers';
import { Body, Controller, Delete, Get, Injectable, Param, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { BackupsService } from './backups.service';
import { BackupRequestDto, DeleteAppBackupBodyDto, GetAppBackupsDto, GetAppBackupsQueryDto, RestoreAppBackupDto } from './dto/backups.dto';

@Injectable()
@UseGuards(AuthGuard)
@Controller('backups')
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  @Post(':urn/backup')
  async backupApp(@Param('urn') urn: string): Promise<BackupRequestDto> {
    return this.backupsService.backupApp({ appUrn: castAppUrn(urn) });
  }

  @Post(':urn/restore')
  async restoreAppBackup(@Param('urn') urn: string, @Body() body: RestoreAppBackupDto): Promise<BackupRequestDto> {
    return this.backupsService.restoreApp({ appUrn: castAppUrn(urn), filename: body.filename });
  }

  @Get(':urn')
  @ApiQuery({ name: 'pageSize', type: Number, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ZodSerializerDto(GetAppBackupsDto)
  async getAppBackups(@Param('urn') urn: string, @Query() query: GetAppBackupsQueryDto): Promise<GetAppBackupsDto> {
    const backups = await this.backupsService.getAppBackups({ appUrn: castAppUrn(urn), page: query.page ?? 0, pageSize: query.pageSize ?? 10 });

    return backups;
  }

  @Delete(':urn')
  async deleteAppBackup(@Param('urn') urn: string, @Body() body: DeleteAppBackupBodyDto) {
    return this.backupsService.deleteAppBackup({ appUrn: castAppUrn(urn), filename: body.filename });
  }

  @Get(':urn/download/:filename')
  async downloadAppBackup(@Param('urn') urn: string, @Param('filename') filename: string, @Res() res: Response) {
    return this.backupsService.downloadAppBackup({ appUrn: castAppUrn(urn), filename }, res);
  }

  @Post(':urn/upload')
  @UseInterceptors(FileInterceptor('backup'))
  async uploadAppBackup(@Param('urn') urn: string, @UploadedFile() file: Express.Multer.File): Promise<BackupRequestDto> {
    return this.backupsService.uploadAndRestoreAppBackup({ appUrn: castAppUrn(urn), file });
  }
}
