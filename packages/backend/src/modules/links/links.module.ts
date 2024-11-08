import { Module } from '@nestjs/common';
import { LinksController } from './links.controller';
import { LinksRepository } from './links.repository';
import { LinksService } from './links.service';

@Module({
  imports: [],
  controllers: [LinksController],
  providers: [LinksService, LinksRepository],
})
export class LinksModule {}
