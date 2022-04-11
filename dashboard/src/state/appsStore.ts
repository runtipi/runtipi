import create from 'zustand';
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
  statues: {};
};

export const useAppsStore = create<AppsStore>((set, get) => ({
  apps: [],
  status: RequestStatus.LOADING,
  installed: () => {
    const i = get().apps.filter((app) => app.installed);
    return i;
  },
  available: () => {
    return get().apps.filter((app) => !app.installed);
  },
  fetch: async () => {
    set({ status: RequestStatus.LOADING });

    const response = await api.fetch<AppConfig[]>({
      endpoint: '/apps/list',
      method: 'get',
    });

    set({ apps: response, status: RequestStatus.SUCCESS });
  },
  install: async (appId: string) => {
    set((state) => ({ ...state, statues: { [appId]: AppStatus.INSTALLING } }));

    await api.fetch({
      endpoint: `/apps/install/${appId}`,
      method: 'post',
    });

    set((state) => ({ ...state, statues: { [appId]: AppStatus.RUNNING } }));

    await get().fetch();
  },
  fetchApp: async (appId: string) => {
    const response = await api.fetch<AppConfig>({
      endpoint: `/apps/info/${appId}`,
      method: 'get',
    });

    set((state) => {
      const apps = state.apps.map((app) => {
        if (app.id === response.id) {
          return response;
        }

        return app;
      });

      return { ...state, apps };
    });
  },
  getApp: (appId: string) => {
    return get().apps.find((app) => app.id === appId);
  },
  statues: {},
}));
