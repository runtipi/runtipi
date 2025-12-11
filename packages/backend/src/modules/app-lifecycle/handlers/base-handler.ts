import type { AppUrn } from '@runtipi/common/types';

export type HandlerResult = { requestId: string };

export interface ILifecycleHandler<TParams = unknown> {
  execute(appUrn: AppUrn, params?: TParams): Promise<HandlerResult>;
}

export function generateRequestId(): string {
  return crypto.randomUUID();
}
