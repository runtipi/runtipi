import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { iconForCategory } from '@/modules/app/helpers/table-helpers';
import type { AppCategory } from '@/types/app.types';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconX } from '@tabler/icons-react';

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

  type Selection = AppCategory | 'clear';

  const handleChange = (option?: Selection) => {
    if (option === 'clear') {
      handleReset();
      return;
    }
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
      <SelectTrigger value={value} className={className}>
        <SelectValue placeholder={t('APP_STORE_CHOOSE_CATEGORY')} />
      </SelectTrigger>
      <SelectContent>
        {value && (
          <>
            <SelectItem key="clear" value="clear">
              <span className="d-flex gap-2">
                <IconX size={20} />
                {t('CLEAR')}
              </span>
            </SelectItem>
            <div className="dropdown-divider" />
          </>
        )}
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
