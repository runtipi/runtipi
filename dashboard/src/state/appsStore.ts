import produce from 'immer';
import create, { GetState, SetState } from 'zustand';
import api from '../core/api';
import { AppConfig, AppStatus, RequestStatus } from '../core/types';

type AppsStore = {
  apps: AppConfig[];
  status: RequestStatus;
  installed: () => AppConfig[];
  available: () => AppConfig[];
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
type Get = GetState<AppsStore>;

const sortApps = (apps: AppConfig[]) => apps.sort((a, b) => a.name.localeCompare(b.name));

const setAppStatus = (appId: string, status: AppStatus, set: Set) => {
  set((state) => {
    return produce(state, (draft) => {
      const app = draft.apps.find((a) => a.id === appId);
      if (app) app.status = status;
    });
  });
};

const installed = (get: Get) => {
  const i = get().apps.filter((app) => app.installed);
  return i;
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

    return { ...state, apps: sortApps(apps) };
  });
};

export const useAppsStore = create<AppsStore>((set, get) => ({
  apps: [],
  status: RequestStatus.LOADING,
  installed: () => installed(get),
  available: () => {
    return get().apps.filter((app) => !app.installed);
  },
  fetchApp: async (appId: string) => fetchApp(appId, set),
  fetch: async () => {
    set({ status: RequestStatus.LOADING });

    const response = await api.fetch<AppConfig[]>({
      endpoint: '/apps/list',
      method: 'get',
    });

    set({ apps: sortApps(response), status: RequestStatus.SUCCESS });
  },
  getApp: (appId: string) => {
    return get().apps.find((app) => app.id === appId);
  },
  install: async (appId: string, form?: Record<string, string>) => {
    setAppStatus(appId, AppStatus.INSTALLING, set);

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
    setAppStatus(appId, AppStatus.UNINSTALLING, set);

    await api.fetch({
      endpoint: `/apps/uninstall/${appId}`,
    });

    await get().fetchApp(appId);
  },
  stop: async (appId: string) => {
    setAppStatus(appId, AppStatus.STOPPING, set);

    await api.fetch({
      endpoint: `/apps/stop/${appId}`,
    });

    await get().fetchApp(appId);
  },
  start: async (appId: string) => {
    setAppStatus(appId, AppStatus.STARTING, set);

    await api.fetch({
      endpoint: `/apps/start/${appId}`,
    });

    await get().fetchApp(appId);
  },
}));
