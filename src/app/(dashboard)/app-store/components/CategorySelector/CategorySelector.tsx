import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import type { AppCategory } from '@runtipi/shared';
import { useTranslations } from 'next-intl';
import { iconForCategory } from '../../helpers/table.helpers';

interface Props {
  onSelect: (value?: AppCategory) => void;
  className?: string;
  value?: AppCategory;
}

export const CategorySelector = ({ onSelect, className, value }: Props) => {
  const t = useTranslations();
  const options = iconForCategory.map((category) => ({
    value: category.id,
    label: t(`APP_CATEGORY_${category.id.toUpperCase() as Uppercase<typeof category.id>}`),
    icon: category.icon,
  }));

  const handleChange = (option: AppCategory) => {
    onSelect(option);
  };

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger value={value} className={className}>
        <SelectValue placeholder={t('APP_INSTALL_FORM_CHOOSE_OPTION')} />
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
