import produce from 'immer';
import create, { SetState } from 'zustand';
import api from '../core/api';
import { AppConfig, AppStatusEnum } from '@runtipi/common';
import { RequestStatus } from '../core/types';

type AppsStore = {
  apps: AppConfig[];
  status: RequestStatus;
  fetch: () => void;
  getApp: (id: string) => AppConfig | undefined;
  fetchApp: (id: string) => void;
  install: (id: string, form: Record<string, string>) => Promise<void>;
  update: (id: string, form: Record<string, string>) => Promise<void>;
  uninstall: (id: string) => Promise<void>;
  stop: (id: string) => Promise<void>;
  start: (id: string) => Promise<void>;
};

type Set = SetState<AppsStore>;

const sortApps = (a: AppConfig, b: AppConfig) => a.name.localeCompare(b.name);

const setAppStatus = (appId: string, status: AppStatusEnum, set: Set) => {
  set((state) => {
    return produce(state, (draft) => {
      const app = draft.apps.find((a) => a.id === appId);
      if (app) app.status = status;
    });
  });
};

/**
 * Fetch one app and add it to the list of apps.
 * @param appId
 * @param set
 */
const fetchApp = async (appId: string, set: Set) => {
  const response = await api.fetch<AppConfig>({
    endpoint: `/apps/info/${appId}`,
    method: 'get',
  });

  set((state) => {
    const apps = state.apps.filter((app) => app.id !== appId);
    apps.push(response);

    return { ...state, apps: apps.sort(sortApps) };
  });
};

export const useAppsStore = create<AppsStore>((set, get) => ({
  apps: [],
  status: RequestStatus.LOADING,
  fetchApp: async (appId: string) => fetchApp(appId, set),
  fetch: async () => {
    set({ status: RequestStatus.LOADING });

    const response = await api.fetch<AppConfig[]>({
      endpoint: '/apps/list',
      method: 'get',
    });

    const apps = response.sort(sortApps);

    set({ apps, status: RequestStatus.SUCCESS });
  },
  getApp: (appId: string) => {
    return get().apps.find((app) => app.id === appId);
  },
  install: async (appId: string, form?: Record<string, string>) => {
    setAppStatus(appId, AppStatusEnum.INSTALLING, set);

    await api.fetch({
      endpoint: `/apps/install/${appId}`,
      method: 'POST',
      data: { form },
    });

    await get().fetchApp(appId);
  },
  update: async (appId: string, form?: Record<string, string>) => {
    await api.fetch({
      endpoint: `/apps/update/${appId}`,
      method: 'POST',
      data: { form },
    });

    await get().fetchApp(appId);
  },
  uninstall: async (appId: string) => {
    setAppStatus(appId, AppStatusEnum.UNINSTALLING, set);

    await api.fetch({
      endpoint: `/apps/uninstall/${appId}`,
    });

    await get().fetchApp(appId);
  },
  stop: async (appId: string) => {
    setAppStatus(appId, AppStatusEnum.STOPPING, set);

    await api.fetch({
      endpoint: `/apps/stop/${appId}`,
    });

    await get().fetchApp(appId);
  },
  start: async (appId: string) => {
    setAppStatus(appId, AppStatusEnum.STARTING, set);

    await api.fetch({
      endpoint: `/apps/start/${appId}`,
    });

    await get().fetchApp(appId);
  },
}));
