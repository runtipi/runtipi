import create from 'zustand';
import { AppCategoriesEnum } from '../../../generated/graphql';
import { SortableColumns } from '../helpers/table.types';

type Store = {
  search: string;
  setSearch: (textSearch: string) => void;
  category?: AppCategoriesEnum;
  setCategory: (selectedCategories?: AppCategoriesEnum) => void;
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
  sort: 'name',
  setSort: (sort) => set({ sort }),
  sortDirection: 'asc',
  setSortDirection: (sortDirection) => set({ sortDirection }),
}));
