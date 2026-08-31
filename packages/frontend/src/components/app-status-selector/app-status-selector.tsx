import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { IconX } from '@tabler/icons-react';
import type { CSSProperties } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { APP_STATUS_TYPES } from '../../../../common/dist/schemas/sse';

type AppStatusValue = (typeof APP_STATUS_TYPES)[keyof typeof APP_STATUS_TYPES];

interface Props {
  onSelect: (value?: AppStatusValue) => void;
  className?: string;
  style?: CSSProperties;
  initialValue?: AppStatusValue;
}

export const AppStatusSelector = ({ onSelect, className, style, initialValue }: Props) => {
  const { t } = useTranslation();
  const [key, setKey] = useState(Date.now().toString());

  const options = Object.entries(APP_STATUS_TYPES).map((status) => ({
    value: status[1],
    label: t(`APP_STATUS_${status[0]}`),
  }));

  const [value, setValue] = useState(initialValue);

  const handleChange = (option: string) => {
    if (option === 'clear') {
      handleReset();
      return;
    }
    const nextValue = option as AppStatusValue;
    setValue(nextValue);
    onSelect(nextValue);
  };

  const handleReset = () => {
    setValue(undefined);
    onSelect(undefined);
    setKey(Date.now().toString());
  };

  return (
    <div style={style}>
      <Select key={key} value={value} onValueChange={handleChange}>
        <SelectTrigger value={value} className={className} onClear={handleReset}>
          <SelectValue placeholder={t('MY_APPS_CHOOSE_APP_STATUS')} />
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
    </div>
  );
};
