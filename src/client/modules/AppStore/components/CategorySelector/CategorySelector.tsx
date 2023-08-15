import React from 'react';
import Select, { SingleValue, OptionProps, ControlProps, components } from 'react-select';
import { Icon } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { AppCategory } from '@runtipi/shared';
import { APP_CATEGORIES } from '../../../../core/constants';
import { useUIStore } from '../../../../state/uiStore';

const { Option, Control } = components;

interface IProps {
  onSelect: (value?: AppCategory) => void;
  className?: string;
  initialValue?: AppCategory;
}

type OptionsType = { value: AppCategory; label: string; icon: Icon };

const IconOption = (props: OptionProps<OptionsType>) => {
  const { data } = props;
  const { icon: CategoryIcon, label } = data;
  return (
    <Option {...props}>
      <>
        <CategoryIcon size={20} />
        <span style={{ marginLeft: 10 }}>{label}</span>
      </>
    </Option>
  );
};

const ControlComponent = (props: ControlProps<OptionsType>) => {
  const { children, ...rest } = props;
  const { getValue } = props;

  const value = getValue()[0];

  if (value?.icon) {
    return (
      <Control {...rest}>
        <value.icon className="ms-2" size={20} />
        {children}
      </Control>
    );
  }

  return <Control {...rest}> {children}</Control>;
};

const CategorySelector: React.FC<IProps> = ({ onSelect, className, initialValue }) => {
  const t = useTranslations('apps');
  const { darkMode } = useUIStore();
  const options: OptionsType[] = APP_CATEGORIES.map((category) => ({
    value: category.id,
    label: t(`app-details.categories.${category.id}`),
    icon: category.icon,
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
        menu: (provided: object) => ({
          ...provided,
          backgroundColor: bgColor,
          color,
        }),
        control: (provided: object) => ({
          ...provided,
          backgroundColor: bgColor,
          color,
          borderColor,
        }),
        option: (provided: object, state: { isFocused: boolean }) => ({
          ...provided,
          backgroundColor: state.isFocused ? '#243049' : bgColor,
          color: state.isFocused ? '#fff' : color,
        }),
        singleValue: (provided: object) => ({
          ...provided,
          color,
          fontSize: '0.8rem',
        }),
        placeholder: (provided: object) => ({
          ...provided,
          color: '#a5a9b1',
          fontSize: '0.8rem',
        }),
      }}
      components={{
        Option: IconOption,
        Control: ControlComponent,
      }}
      onChange={handleChange}
      defaultValue={[]}
      name="categories"
      options={options}
      placeholder={t('app-store.category-placeholder')}
    />
  );
};

export default CategorySelector;
