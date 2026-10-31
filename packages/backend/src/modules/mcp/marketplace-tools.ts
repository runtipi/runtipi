import { Injectable } from '@nestjs/common';
import { type } from 'arktype';
import { AppStoreService } from '@/modules/app-stores/app-store.service';
import { MarketplaceService } from '@/modules/marketplace/marketplace.service';
import { CreateAppStoreBodyDto, UpdateAppStoreBodyDto } from '@/modules/marketplace/dto/marketplace.dto';
import { ToolRegistry } from './tool-registry';
import { emptyInput, toolOutputs } from './tool-contracts';

@Injectable()
export class McpMarketplaceTools {
  constructor(
    private readonly stores: AppStoreService,
    private readonly marketplace: MarketplaceService,
  ) {}

  register(tools: ToolRegistry) {
    tools.add(
      'list_app_stores',
      'List all app stores.',
      emptyInput,
      toolOutputs.list_app_stores,
      async () => ({ appStores: await this.stores.getAllAppStores() }),
      true,
    );
    tools.add(
      'list_enabled_app_stores',
      'List enabled app stores.',
      emptyInput,
      toolOutputs.list_enabled_app_stores,
      async () => ({ appStores: await this.stores.getEnabledAppStores() }),
      true,
    );
    tools.add(
      'create_app_store',
      'Add an app store and refresh the marketplace.',
      CreateAppStoreBodyDto.schema,
      toolOutputs.create_app_store,
      (input) => this.marketplace.createAppStore(input),
    );
    tools.add(
      'update_app_store',
      'Update a store and refresh the marketplace.',
      type({ id: 'string', settings: UpdateAppStoreBodyDto.schema }),
      toolOutputs.update_app_store,
      async ({ id, settings }) => {
        await this.marketplace.updateAppStore(id, settings);
        return { success: true };
      },
    );
    tools.add(
      'delete_app_store',
      'Remove an app store and refresh the marketplace.',
      type({ id: 'string' }),
      toolOutputs.delete_app_store,
      async ({ id }) => {
        await this.marketplace.deleteAppStore(id);
        return { success: true };
      },
    );
    tools.add('pull_app_stores', 'Pull app store repositories and refresh the marketplace.', emptyInput, toolOutputs.pull_app_stores, () =>
      this.marketplace.pullAppStores(),
    );
  }
}
