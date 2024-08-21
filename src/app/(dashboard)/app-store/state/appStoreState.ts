import { create } from 'zustand';
import { AppCategory } from '@runtipi/shared';
import { SortableColumns } from '../helpers/table.types';

type Store = {
  search: string;
  setSearch: (textSearch: string) => void;
  category?: AppCategory;
  setCategory: (selectedCategories?: AppCategory) => void;
  sort: SortableColumns;
  setSort: (sort: SortableColumns) => void;
  sortDirection: 'asc' | 'desc';
  setSortDirection: (sortDirection: 'asc' | 'desc') => void;
  hideInstalledApps: boolean,
  setHideInstalledApps: (hideInstalledApps: boolean) => void;
};

const debouncedSearch = (fn: (search: string) => void, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (search: string) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(search);
    }, delay);
  };
};

export const useAppStoreState = create<Store>((set) => ({
  category: undefined,
  search: '',
  setSearch: debouncedSearch((search) => set({ search }), 300),
  setCategory: (category) => set({ category }),
  sort: 'id',
  setSort: (sort) => set({ sort }),
  sortDirection: 'asc',
  setSortDirection: (sortDirection) => set({ sortDirection }),
  hideInstalledApps: false,
  setHideInstalledApps: (hideInstalledApps) => set({hideInstalledApps})
}));
