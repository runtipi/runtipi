import { Module } from '@nestjs/common';
import { LinksController } from './links.controller.js';
import { LinksRepository } from './links.repository.js';
import { LinksService } from './links.service.js';

@Module({
  imports: [],
  controllers: [LinksController],
  providers: [LinksService, LinksRepository],
})
export class LinksModule {}
