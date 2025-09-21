import { TranslatableError } from '@/common/error/translatable-error';
import { Body, Controller, Delete, Get, Injectable, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { EditLinkBodyDto, LinkBodyDto, LinksDto } from './dto/links.dto';
import { LinksService } from './links.service';
import { ApiResponse } from '@nestjs/swagger';

@Injectable()
@Controller('links')
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @Get('guest')
  @ApiResponse({ type: LinksDto })
  async getGuestLinks() {
    const links = await this.linksService.getGuestDashboardLinks();
    return LinksDto.parse({ links }, { reportOnly: true });
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiResponse({ type: LinksDto })
  async getLinks(@Req() req: Request) {
    const links = await this.linksService.getLinks(req.user?.id);

    return LinksDto.parse({ links }, { reportOnly: true });
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
