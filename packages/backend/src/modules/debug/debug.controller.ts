import { Controller, Post } from '@nestjs/common';
import { DebugService } from './debug.service';

@Controller('debug')
export class DebugController {
  constructor(private readonly debugService: DebugService) {}

  @Post('seed')
  async seedDatabase() {
    return this.debugService.seedDatabase();
  }
}

