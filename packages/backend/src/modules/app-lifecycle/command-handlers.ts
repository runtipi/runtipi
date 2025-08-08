import type { AppUrn } from '@runtipi/common/types';
import type { SSE } from '@runtipi/common/schemas';

/**
 * Declarative command handling configuration.
 *
 * Each command maps to instructions for success and failure:
 * - notifyEvent: SSE event name to emit via notifier
 * - notifyPayload: optional static payload to include in the SSE data
 * - repoUpdate: optional object to pass to appRepository.updateAppById(appId, repoUpdate)
 * - repoDelete: optional boolean - if true, delete the app via repository
 *
 * The orchestrator (AppLifecycleService) will interpret these directives and call
 * notifier/appRepository accordingly. This keeps the mapping declarative and easy
 * to extend without inlining many switch/case blocks.
 */

type NotifyEvent = Extract<SSE, { topic: 'app' }>['data']['event'];

type ActionDescriptor = {
  notifyEvent?: NotifyEvent;
  notifyPayload?: Record<string, unknown>;
  repoUpdate?: Record<string, unknown>;
  repoDelete?: boolean;
};

type CommandDescriptor = {
  success?: ActionDescriptor;
  failure?: ActionDescriptor;
};

export const COMMAND_HANDLERS: Record<string, CommandDescriptor> = {
  start: {
    success: {
      notifyEvent: 'start_success',
      notifyPayload: { appStatus: 'running' },
      repoUpdate: { status: 'running', pendingRestart: false },
    },
    failure: {
      notifyEvent: 'start_error',
      notifyPayload: { appStatus: 'stopped' },
      repoUpdate: { status: 'stopped' },
    },
  },

  install: {
    success: {
      notifyEvent: 'install_success',
      notifyPayload: { appStatus: 'running' },
      repoUpdate: { status: 'running' },
    },
    failure: {
      notifyEvent: 'install_error',
      notifyPayload: { appStatus: 'missing' },
      repoDelete: true,
    },
  },

  stop: {
    success: {
      notifyEvent: 'stop_success',
      notifyPayload: { appStatus: 'stopped' },
      repoUpdate: { status: 'stopped' },
    },
    failure: {
      notifyEvent: 'stop_error',
      notifyPayload: { appStatus: 'running' },
      repoUpdate: { status: 'running' },
    },
  },

  restart: {
    success: {
      notifyEvent: 'restart_success',
      notifyPayload: { appStatus: 'running' },
      repoUpdate: { status: 'running', pendingRestart: false },
    },
    failure: {
      notifyEvent: 'restart_error',
      notifyPayload: { appStatus: 'running' },
      repoUpdate: { status: 'stopped' },
    },
  },

  uninstall: {
    success: {
      notifyEvent: 'uninstall_success',
      notifyPayload: { appStatus: 'missing' },
      repoDelete: true,
    },
    failure: {
      notifyEvent: 'uninstall_error',
      notifyPayload: { appStatus: 'stopped' },
      repoUpdate: { status: 'stopped' },
    },
  },

  update: {
    // update flow has extra orchestration in service (version bump, restart), keep generic notifications here
    success: {
      notifyEvent: 'update_success',
    },
    failure: {
      notifyEvent: 'update_error',
      repoUpdate: { status: 'stopped' },
    },
  },

  // default catch-all can be omitted; service will emit generic events for unknown commands
};
