import React from 'react';
import Select, { SingleValue } from 'react-select';
import { APP_CATEGORIES } from '../../../../core/constants';
import { AppCategory } from '../../../../core/types';
import { useUIStore } from '../../../../state/uiStore';

interface IProps {
  onSelect: (value?: AppCategory) => void;
  className?: string;
  initialValue?: AppCategory;
}

type OptionsType = { value: AppCategory; label: string };

const CategorySelector: React.FC<IProps> = ({ onSelect, className, initialValue }) => {
  const { darkMode } = useUIStore();
  const options: OptionsType[] = APP_CATEGORIES.map((category) => ({
    value: category.id,
    label: category.name,
  }));

  const [value, setValue] = React.useState<OptionsType | null>(options.find((o) => o.value === initialValue) || null);

  const handleChange = (option: SingleValue<OptionsType>) => {
    setValue(option as OptionsType);
    onSelect(option?.value);
  };

  const color = darkMode ? '#fff' : '#1a2234';
  const bgColor = darkMode ? '#1a2234' : '#fff';
  const borderColor = darkMode ? '#243049' : '#e5e5e5';

  return (
    <Select<OptionsType>
      isClearable
      className={className}
      value={value}
      styles={{
        menu: (provided: any) => ({
          ...provided,
          backgroundColor: bgColor,
          color,
        }),
        control: (provided: any) => ({
          ...provided,
          backgroundColor: bgColor,
          color,
          borderColor,
        }),
        option: (provided: any, state: any) => ({
          ...provided,
          backgroundColor: state.isFocused ? '#243049' : bgColor,
          color: state.isFocused ? '#fff' : color,
        }),
        singleValue: (provided: any) => ({
          ...provided,
          color,
          fontSize: '0.8rem',
        }),
        placeholder: (provided: any) => ({
          ...provided,
          color: '#a5a9b1',
          fontSize: '0.8rem',
        }),
      }}
      onChange={handleChange}
      defaultValue={[]}
      name="categories"
      options={options as any}
      placeholder="Category"
    />
  );
};

export default CategorySelector;
