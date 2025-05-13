import { TranslatableError } from '@/common/error/translatable-error.js';
import { Body, Controller, Delete, Get, Injectable, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard.js';
import { EditLinkBodyDto, LinkBodyDto, LinksDto } from './dto/links.dto.js';
import { LinksService } from './links.service.js';

@Injectable()
@Controller('links')
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @Get('guest')
  @ZodSerializerDto(LinksDto)
  async getGuestLinks(): Promise<LinksDto> {
    const links = await this.linksService.getGuestDashboardLinks();
    return { links };
  }

  @Get()
  @UseGuards(AuthGuard)
  @ZodSerializerDto(LinksDto)
  async getLinks(@Req() req: Request): Promise<LinksDto> {
    const links = await this.linksService.getLinks(req.user?.id);

    return { links };
  }

  @Post()
  @UseGuards(AuthGuard)
  async createLink(@Body() body: LinkBodyDto, @Req() req: Request) {
    if (!req.user) {
      throw new TranslatableError('SYSTEM_ERROR_YOU_MUST_BE_LOGGED_IN');
    }

    return this.linksService.add(body, req.user.id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  async editLink(@Param('id') id: number, @Body() body: EditLinkBodyDto, @Req() req: Request) {
    if (!req.user) {
      throw new TranslatableError('SYSTEM_ERROR_YOU_MUST_BE_LOGGED_IN');
    }

    return this.linksService.edit(id, body, req.user.id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async deleteLink(@Param('id') id: number, @Req() req: Request) {
    if (!req.user) {
      throw new TranslatableError('SYSTEM_ERROR_YOU_MUST_BE_LOGGED_IN');
    }

    return this.linksService.delete(id, req.user.id);
  }
}
