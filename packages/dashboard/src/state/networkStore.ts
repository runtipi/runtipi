import create from 'zustand';
import api from '../core/api';

type AppsStore = {
  internalIp: string;
  fetchInternalIp: () => void;
};

export const useNetworkStore = create<AppsStore>((set) => ({
  internalIp: '',
  fetchInternalIp: async () => {
    const response = await api.fetch<string>({
      endpoint: '/network/internal-ip',
      method: 'get',
    });

    set({ internalIp: response });
  },
}));
