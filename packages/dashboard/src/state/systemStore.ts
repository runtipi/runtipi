import create from 'zustand';
import api from '../core/api';

type Store = {
  cpuLoad: number;
  disk: { size: number; used: number; available: number };
  memory: { total: number; used: number; free: number };
  fetchDiskSpace: () => void;
  fetchCpuLoad: () => void;
  fetchMemoryLoad: () => void;
};

export const useSytemStore = create<Store>((set) => ({
  cpuLoad: 0,
  memory: { total: 0, used: 0, free: 0 },
  disk: { size: 0, used: 0, available: 0 },
  fetchDiskSpace: async () => {
    const response = await api.fetch<any>({
      endpoint: '/system/disk',
      method: 'get',
    });

    set({ disk: response });
  },
  fetchCpuLoad: async () => {
    const response = await api.fetch<any>({
      endpoint: '/system/cpu',
      method: 'get',
    });

    set({ cpuLoad: response.load });
  },
  fetchMemoryLoad: async () => {
    const response = await api.fetch<any>({
      endpoint: '/system/memory',
      method: 'get',
    });

    set({ memory: response });
  },
}));
