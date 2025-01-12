import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { iconForCategory } from '@/modules/app/helpers/table-helpers';
import type { AppCategory } from '@/types/app.types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  onSelect: (value?: AppCategory) => void;
  className?: string;
  initialValue?: AppCategory;
}

export const CategorySelector = ({ onSelect, className, initialValue }: Props) => {
  const { t } = useTranslation();
  const [resetCounter, setResetCounter] = useState(0);

  const options = iconForCategory.map((category) => ({
    value: category.id,
    label: t(`APP_CATEGORY_${category.id.toUpperCase()}`),
    icon: category.icon,
  }));

  const [value, setValue] = useState(initialValue);

  const handleChange = (option?: AppCategory) => {
    setValue(option);
    onSelect(option);
  };

  const handleReset = () => {
    setValue(undefined);
    onSelect(undefined);
    setResetCounter((prev) => prev + 1);
  };

  return (
    <Select key={resetCounter.toString()} value={value} onValueChange={(o: AppCategory) => handleChange(o)}>
      <SelectTrigger value={value} onClear={handleReset} className={className}>
        <SelectValue placeholder={t('APP_STORE_CHOOSE_CATEGORY')} />
      </SelectTrigger>
      <SelectContent>
        {options?.map(({ value: category, icon: CategoryIcon, label }) => (
          <SelectItem key={category} value={category}>
            <span className="d-flex gap-2">
              <CategoryIcon size={20} />
              {label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
