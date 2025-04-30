import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  onSelect: (value?: string) => void;
  className?: string;
  initialValue?: string;
  stores: { name: string; slug: string }[];
}

export const StoreSelector = ({ onSelect, className, initialValue, stores }: Props) => {
  const { t } = useTranslation();
  const [key, setKey] = useState(new Date().getTime().toString());

  const options = stores.map((store) => ({
    value: store.slug,
    label: store.name,
  }));

  const [value, setValue] = useState(initialValue);

  const handleChange = (option: string) => {
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
    setKey(new Date().getTime().toString());
  };

  return (
    <Select key={key} value={value} onValueChange={handleChange}>
      <SelectTrigger value={value} className={className} onClear={handleReset}>
        <SelectValue placeholder={t('APP_STORE_CHOOSE_STORE')} />
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
        {options?.map(({ value, label }) => (
          <SelectItem key={value} value={value.toString()}>
            <span className="d-flex gap-2">{label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
