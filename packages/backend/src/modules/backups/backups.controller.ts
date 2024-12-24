import { createAppUrn } from '@/common/helpers/app-helpers';
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

  @Post(':appstore/:id/backup')
  async backupApp(@Param('appstore') appstore: string, @Param('id') id: string) {
    const appUrn = createAppUrn(id, appstore);
    return this.backupsService.backupApp({ appUrn });
  }

  @Post(':appstore/:id/restore')
  async restoreAppBackup(@Param('appstore') appstore: string, @Param('id') id: string, @Body() body: RestoreAppBackupDto) {
    const appUrn = createAppUrn(id, appstore);
    return this.backupsService.restoreApp({ appUrn, filename: body.filename });
  }

  @Get(':appstore/:id')
  @ApiQuery({ name: 'pageSize', type: Number, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ZodSerializerDto(GetAppBackupsDto)
  async getAppBackups(
    @Param('appstore') appstore: string,
    @Param('id') id: string,
    @Query() query: GetAppBackupsQueryDto,
  ): Promise<GetAppBackupsDto> {
    const appUrn = createAppUrn(id, appstore);
    const backups = await this.backupsService.getAppBackups({ appUrn, page: query.page ?? 0, pageSize: query.pageSize ?? 10 });

    return backups;
  }

  @Delete(':appid')
  async deleteAppBackup(@Param('appstore') appstore: string, @Param('id') id: string, @Body() body: DeleteAppBackupBodyDto) {
    const appUrn = createAppUrn(id, appstore);
    return this.backupsService.deleteAppBackup({ appUrn, filename: body.filename });
  }
}
