import { TranslatableError } from '@/common/error/translatable-error';
import { Body, Controller, Delete, Get, Injectable, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ZodSerializerDto } from 'nestjs-zod';
import { AuthGuard } from '../auth/auth.guard';
import { EditLinkBodyDto, LinkBodyDto, LinksDto } from './dto/links.dto';
import { LinksService } from './links.service';

@Injectable()
@Controller('links')
@UseGuards(AuthGuard)
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @Get()
  @ZodSerializerDto(LinksDto)
  async getLinks(@Req() req: Request): Promise<LinksDto> {
    const links = await this.linksService.getLinks(req.user?.id);

    return { links };
  }

  @Post()
  async createLink(@Body() body: LinkBodyDto, @Req() req: Request) {
    if (!req.user) {
      throw new TranslatableError('SYSTEM_ERROR_YOU_MUST_BE_LOGGED_IN');
    }

    return this.linksService.add(body, req.user.id);
  }

  @Patch(':id')
  async editLink(@Param('id') id: number, @Body() body: EditLinkBodyDto, @Req() req: Request) {
    if (!req.user) {
      throw new TranslatableError('SYSTEM_ERROR_YOU_MUST_BE_LOGGED_IN');
    }

    return this.linksService.edit(id, body, req.user.id);
  }

  @Delete(':id')
  async deleteLink(@Param('id') id: number, @Req() req: Request) {
    if (!req.user) {
      throw new TranslatableError('SYSTEM_ERROR_YOU_MUST_BE_LOGGED_IN');
    }

    return this.linksService.delete(id, req.user.id);
  }
}
