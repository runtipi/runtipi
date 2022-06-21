import { Query, Resolver } from 'type-graphql';
import SystemService from './system.service';
import { SystemInfoResponse, VersionResponse } from './system.types';

@Resolver()
export default class AuthResolver {
  @Query(() => SystemInfoResponse, { nullable: true })
  async systemInfo(): Promise<SystemInfoResponse> {
    return SystemService.systemInfo();
  }

  @Query(() => String)
  async version(): Promise<VersionResponse> {
    return SystemService.getVersion();
  }
}
