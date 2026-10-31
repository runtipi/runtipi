import { BadRequestException, Controller, Get, Param, Post, Put, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { castAppUrn } from '@/common/helpers/app-helpers';
import { BackupsService } from '@/modules/backups/backups.service';
import { CustomAppService } from '@/modules/custom-apps/custom-apps.service';
import { McpGuard, type AgentRequest } from './mcp.guard';
import { validateBackupFilename } from './transfer-validation';

type UploadedAsset = { buffer: Buffer; mimetype: string; originalname: string };

@ApiExcludeController()
@UseGuards(McpGuard)
@Controller('mcp/transfers')
export class McpTransfersController {
  constructor(
    private readonly backups: BackupsService,
    private readonly customApps: CustomAppService,
  ) {}

  @Get('backups/:urn/:filename')
  async downloadBackup(@Param('urn') urn: string, @Param('filename') filename: string, @Res() response: Response) {
    validateBackupFilename(filename);
    const file = await this.backups.getBackupFilePath({ appUrn: castAppUrn(urn), filename });

    response.set({ 'Content-Type': 'application/gzip', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store' });
    return response.sendFile(file);
  }

  @Put('backups/:urn/:filename')
  async uploadBackupStream(@Param('urn') urn: string, @Param('filename') filename: string, @Req() request: AgentRequest) {
    validateBackupFilename(filename);
    if (!request.is('application/gzip')) throw new BadRequestException('Use Content-Type: application/gzip for streamed uploads');

    await this.backups.uploadBackupStream({ appUrn: castAppUrn(urn), filename, source: request });
    return { success: true };
  }

  @Post('backups/:urn/:filename')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 64 * 1024 * 1024, files: 1 } }))
  async uploadBackup(@Param('urn') urn: string, @Param('filename') filename: string, @UploadedFile() file?: UploadedAsset) {
    validateBackupFilename(filename);
    if (!file || file.originalname !== filename) throw new BadRequestException('The uploaded backup name must match the requested filename');

    await this.backups.uploadBackup({ appUrn: castAppUrn(urn), filename, fileBuffer: file.buffer });
    return { success: true };
  }

  @Post('images/:urn')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  async uploadImage(@Param('urn') urn: string, @UploadedFile() file?: UploadedAsset) {
    if (!file) throw new BadRequestException('A JPG image is required');

    const correctMime = ['image/jpeg', 'image/jpg'].includes(file.mimetype);
    const correctHeader = file.buffer[0] === 0xff && file.buffer[1] === 0xd8;
    if (!correctMime || !correctHeader) throw new BadRequestException('A JPG image is required');

    await this.customApps.uploadAppImage(castAppUrn(urn), file.buffer);
    return { success: true };
  }
}
