import { castAppUrn } from '@/common/helpers/app-helpers';
import { Body, Controller, Delete, Get, Injectable, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { BackupsService } from './backups.service';
import { BackupRequestDto, DeleteAppBackupBodyDto, GetAppBackupsDto, GetAppBackupsQueryDto, RestoreAppBackupDto } from './dto/backups.dto';

@Injectable()
@UseGuards(AuthGuard)
@Controller('backups')
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  @Post(':urn/backup')
  @ApiResponse({ type: BackupRequestDto })
  async backupApp(@Param('urn') urn: string) {
    const res = await this.backupsService.backupApp({ appUrn: castAppUrn(urn) });
    return BackupRequestDto.parse(res, { reportOnly: true });
  }

  @Post(':urn/restore')
  @ApiResponse({ type: BackupRequestDto })
  async restoreAppBackup(@Param('urn') urn: string, @Body() body: RestoreAppBackupDto) {
    const res = await this.backupsService.restoreApp({ appUrn: castAppUrn(urn), filename: body.filename });
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
    return this.backupsService.deleteAppBackup({ appUrn: castAppUrn(urn), filename: body.filename });
  }
}
