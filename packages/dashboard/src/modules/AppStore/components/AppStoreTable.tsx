import { Flex, Input, SimpleGrid } from '@chakra-ui/react';
import { AppCategoriesEnum, AppConfig } from '@runtipi/common';
import React from 'react';
import { SortableColumns, SortDirection } from '../helpers/table.types';
import AppStoreTile from './AppStoreTile';
import CategorySelect from './CategorySelect';

interface IProps {
  data: AppConfig[];
  onSearch: (value: string) => void;
  onSelectCategories: (value: AppCategoriesEnum[]) => void;
  onSortBy: (value: SortableColumns) => void;
  onChangeDirection: (value: SortDirection) => void;
}

const AppStoreTable: React.FC<IProps> = ({ data, onSearch, onSelectCategories }) => {
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => onSearch(e.target.value);

  return (
    <Flex className="flex-col">
      <div className="flex">
        <div className="flex-1 mr-2">
          <Input placeholder="Search app..." onChange={handleSearch} />
        </div>
        <div className="flex-1">
          <CategorySelect onSelect={onSelectCategories} />
        </div>
      </div>
      <SimpleGrid className="flex-1" minChildWidth="280px" spacing="20px">
        {data.map((app) => (
          <AppStoreTile key={app.id} app={app} />
        ))}
      </SimpleGrid>
    </Flex>
  );
};

export default AppStoreTable;
