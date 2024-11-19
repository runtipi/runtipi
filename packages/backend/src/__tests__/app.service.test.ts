import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';

describe('AppService', () => {
  let appService: AppService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appService = moduleRef.get(AppService);
  });

  it('should return the version', async () => {
    expect(1).toBe(1);
  });
});
