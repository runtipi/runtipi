import { Arg, Authorized, Query, Resolver } from 'type-graphql';
import AppsService from './apps.service';
import { AppConfig, ListAppsResonse } from './apps.types';
import App from './app.entity';

@Resolver()
export default class AppsResolver {
  @Query(() => ListAppsResonse)
  listAppsInfo(): Promise<ListAppsResonse> {
    return AppsService.listApps();
  }

  @Query(() => AppConfig)
  getAppInfo(@Arg('id', () => String) appId: string): Promise<AppConfig> {
    return AppsService.getAppInfo(appId);
  }

  @Authorized()
  @Query(() => [App])
  async installedApps(): Promise<App[]> {
    return App.find();
  }
}
