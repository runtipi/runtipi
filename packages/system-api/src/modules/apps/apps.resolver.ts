import { Query, Resolver } from 'type-graphql';
import AppsService from './apps.service';
import { ListAppsResonse } from './apps.types';

@Resolver()
export default class AppsResolver {
  @Query(() => ListAppsResonse)
  getChannels(): Promise<ListAppsResonse> {
    return AppsService.listApps();
  }
}
