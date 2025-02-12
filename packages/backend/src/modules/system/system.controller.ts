import { Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { LoadDto, UpdateDto } from './dto/system.dto';
import { SystemService } from './system.service';

@UseGuards(AuthGuard)
@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('/load')
  @ZodSerializerDto(LoadDto)
  async systemLoad(): Promise<LoadDto> {
    const res = await this.systemService.getSystemLoad();
    return res;
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

  @Post('/update')
  @ZodSerializerDto(UpdateDto)
  async updateSystem(): Promise<UpdateDto> {
    await this.systemService.updateSystem();

    return { success: true };
  }
}
