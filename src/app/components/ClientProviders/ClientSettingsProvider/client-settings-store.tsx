import { settingsSchema } from '@runtipi/shared';
import { z } from 'zod';
import { createStore } from 'zustand/vanilla';

export type SettingsState = z.infer<typeof settingsSchema>;

export type SettingsActions = object;

export type ClientSettingsStore = SettingsState & SettingsActions;

export const defaultInitState: SettingsState = {};

export const createClientSettingsStore = (initState: SettingsState = defaultInitState) => {
  return createStore<ClientSettingsStore>()(() => ({
    ...initState,
  }));
};
