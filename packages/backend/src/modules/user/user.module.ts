import { Module } from '@nestjs/common';
import { UserRepository } from './user.repository.js';

@Module({
  imports: [],
  controllers: [],
  providers: [UserRepository],
  exports: [UserRepository],
})
export class UserModule {}
