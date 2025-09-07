import { Global, Module } from '@nestjs/common';
import { GithubService } from './github.service';

@Global()
@Module({
  imports: [],
  controllers: [],
  exports: [GithubService],
  providers: [GithubService],
})
export class GithubModule {}
