import { castAppUrn } from '@/common/helpers/app-helpers';
import { Body, Controller, Delete, Get, Injectable, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { BackupsService } from './backups.service';
import { DeleteAppBackupBodyDto, GetAppBackupsDto, GetAppBackupsQueryDto, RestoreAppBackupDto } from './dto/backups.dto';

@Injectable()
@UseGuards(AuthGuard)
@Controller('backups')
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  @Post(':urn/backup')
  async backupApp(@Param('urn') urn: string) {
    return this.backupsService.backupApp({ appUrn: castAppUrn(urn) });
  }

  @Post(':urn/restore')
  async restoreAppBackup(@Param('urn') urn: string, @Body() body: RestoreAppBackupDto) {
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
}
