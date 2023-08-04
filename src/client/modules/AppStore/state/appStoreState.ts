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
};

export const useAppStoreState = create<Store>((set) => ({
  category: undefined,
  search: '',
  setSearch: (search) => set({ search }),
  setCategory: (category) => set({ category }),
  sort: 'id',
  setSort: (sort) => set({ sort }),
  sortDirection: 'asc',
  setSortDirection: (sortDirection) => set({ sortDirection }),
}));
