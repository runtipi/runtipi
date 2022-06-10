import create from 'zustand';
import Cookies from 'js-cookie';
import api from '../core/api';
import { IUser } from '../core/types';

type AppsStore = {
  user: IUser | null;
  configured: boolean;
  me: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchConfigured: () => Promise<void>;
  loading: boolean;
};

export const useAuthStore = create<AppsStore>((set) => ({
  user: null,
  configured: false,
  loading: false,
  me: async () => {
    try {
      set({ loading: true });
      const response = await api.fetch<{ user: IUser | null }>({ endpoint: '/auth/me' });

      set({ user: response.user, loading: false });
    } catch (error) {
      set({ loading: false, user: null });
    }
  },
  login: async (email: string, password: string) => {
    set({ loading: true });

    try {
      const response = await api.fetch<{ user: IUser }>({
        endpoint: '/auth/login',
        method: 'post',
        data: { email, password },
      });
      set({ user: response.user, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },
  logout: async () => {
    Cookies.remove('tipi_token');

    set({ user: null, loading: false });
  },
  register: async (email: string, password: string) => {
    set({ loading: true });

    try {
      const response = await api.fetch<{ user: IUser }>({
        endpoint: '/auth/register',
        method: 'post',
        data: { email, password },
      });
      set({ user: response.user, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },
  fetchConfigured: async () => {
    try {
      const response = await api.fetch<{ configured: boolean }>({ endpoint: '/auth/configured' });
      set({ configured: response.configured });
    } catch (e) {
      set({ configured: false });
    }
  },
}));
