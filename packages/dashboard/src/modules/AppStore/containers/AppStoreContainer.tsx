import { Flex } from '@chakra-ui/react';
import { AppCategoriesEnum } from '@runtipi/common';
import React from 'react';
import AppStoreTable from '../components/AppStoreTable';
import { sortTable } from '../helpers/table.helpers';
import { AppTableData, SortableColumns, SortDirection } from '../helpers/table.types';

// function nonNullable<T>(value: T): value is NonNullable<T> {
//   return value !== null && value !== undefined;
// }

interface IProps {
  apps: AppTableData;
}

const AppStoreContainer: React.FC<IProps> = ({ apps }) => {
  const [search, setSearch] = React.useState('');
  const [categories, setCategories] = React.useState<AppCategoriesEnum[]>([]);
  const [sort, setSort] = React.useState<SortableColumns>('name');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('asc');

  const tableData = React.useMemo(() => {
    return sortTable(apps, sort, sortDirection, categories, search);
  }, [categories, apps, sort, sortDirection, search]);

  const handleSearch = React.useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleCategory = React.useCallback((value: AppCategoriesEnum[]) => {
    setCategories(value);
  }, []);

  const handleSort = React.useCallback((value: SortableColumns) => {
    setSort(value);
  }, []);

  const handleSortDirection = React.useCallback((value: SortDirection) => {
    setSortDirection(value);
  }, []);

  return (
    <Flex className="flex-col">
      <h1 className="font-bold text-3xl mb-5">App Store</h1>
      <AppStoreTable data={tableData} onSearch={handleSearch} onSelectCategories={handleCategory} onSortBy={handleSort} onChangeDirection={handleSortDirection} />
    </Flex>
  );
};

export default AppStoreContainer;
