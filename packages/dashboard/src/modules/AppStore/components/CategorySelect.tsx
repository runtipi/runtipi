import { useColorModeValue } from '@chakra-ui/react';
import React from 'react';
import Select, { Options } from 'react-select';
import { APP_CATEGORIES } from '../../../core/constants';
import { AppCategoriesEnum } from '../../../generated/graphql';

interface IProps {
  onSelect: (value: AppCategoriesEnum[]) => void;
}

type OptionsType = Options<{ value: AppCategoriesEnum; label: string }>;

const CategorySelect: React.FC<IProps> = ({ onSelect }) => {
  const bg = useColorModeValue('white', '#1a202c');

  const options: OptionsType = APP_CATEGORIES.map((category) => ({
    value: category.id,
    label: category.name,
  }));

  const handleChange = (values: OptionsType) => {
    const categories = values.map((category) => category.value);
    onSelect(categories);
  };

  return (
    <Select
      styles={{
        control: (base) => ({ ...base, borderColor: 'gray.600', background: bg, height: 40 }),
        placeholder: (base) => ({ ...base, color: 'gray' }),
        option: (base) => ({ ...base, background: bg, color: 'gray.800' }),
        menu: (base) => ({ ...base, background: bg }),
      }}
      onChange={handleChange}
      defaultValue={[]}
      isMulti
      name="categories"
      options={options as any}
      placeholder="Category..."
      className="basic-multi-select"
      classNamePrefix="select"
    />
  );
};

export default CategorySelect;
