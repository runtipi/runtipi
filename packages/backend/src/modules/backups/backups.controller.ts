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

  @Post(':appid/backup')
  async backupApp(@Param('appid') appId: string) {
    return this.backupsService.backupApp({ appId });
  }

  @Post(':appid/restore')
  async restoreAppBackup(@Param('appid') id: string, @Body() body: RestoreAppBackupDto) {
    return this.backupsService.restoreApp({ appId: id, filename: body.filename });
  }

  @Get(':id')
  @ApiQuery({ name: 'pageSize', type: Number, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ZodSerializerDto(GetAppBackupsDto)
  async getAppBackups(@Param('id') id: string, @Query() query: GetAppBackupsQueryDto): Promise<GetAppBackupsDto> {
    const backups = await this.backupsService.getAppBackups({ appId: id, page: query.page ?? 0, pageSize: query.pageSize ?? 10 });

    return backups;
  }

  @Delete(':appid')
  async deleteAppBackup(@Param('appid') appid: string, @Body() body: DeleteAppBackupBodyDto) {
    return this.backupsService.deleteAppBackup({ appId: appid, filename: body.filename });
  }
}
