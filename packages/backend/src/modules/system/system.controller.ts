import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AppsUsageDto, LoadDto, SystemHistoryDto, SystemInfoDto } from './dto/system.dto';
import { SystemService } from './system.service';
import { ApiResponse } from '@nestjs/swagger';

@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @UseGuards(AuthGuard)
  @Get('/load')
  @ApiResponse({ type: LoadDto })
  async systemLoad() {
    const res = await this.systemService.getSystemLoad();
    return LoadDto.parse(res, { reportOnly: true });
  }

  @UseGuards(AuthGuard)
  @Get('/info')
  @ApiResponse({ type: SystemInfoDto })
  async systemInfo() {
    const res = await this.systemService.getSystemInfo();
    return SystemInfoDto.parse(res, { reportOnly: true });
  }

  @UseGuards(AuthGuard)
  @Get('/history')
  @ApiResponse({ type: SystemHistoryDto })
  async systemHistory() {
    const res = this.systemService.getHistory();
    return SystemHistoryDto.parse(res, { reportOnly: true });
  }

  @UseGuards(AuthGuard)
  @Get('/apps-usage')
  @ApiResponse({ type: AppsUsageDto })
  async appsUsage() {
    const res = this.systemService.getAppsUsage();
    return AppsUsageDto.parse(res, { reportOnly: true });
  }

  @Get('/certificate')
  async downloadLocalCertificate(@Res() res: Response) {
    const cert = await this.systemService.getLocalCertificate();

    res.set({
      'Content-Type': 'application/x-pem-file',
      'Content-Disposition': 'attachment; filename=cert.pem',
    });

    return res.send(cert);
  }
}
