'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { useTranslations } from 'next-intl';
import { allTimezones, useTimezoneSelect } from 'react-timezone-select';

type IProps = {
  timeZone?: string;
  onChange: (timeZone: string) => void;
};

export const TimeZoneSelector = (props: IProps) => {
  const { onChange, timeZone } = props;
  const { options, parseTimezone } = useTimezoneSelect({ labelStyle: 'abbrev', timezones: allTimezones });
  const t = useTranslations();

  const onTimezoneChange = (e: string) => {
    if (!e) return;
    onChange(e);
  };

  const zone = parseTimezone(timeZone || 'Etc/GMT').value || 'Etc/GMT';

  return (
    <Select value={zone} onValueChange={onTimezoneChange}>
      <SelectTrigger className="mb-3" name="timezone" label={t('TIMEZONE_SELECTOR_LABEL')}>
        <SelectValue placeholder={t('TIMEZONE_SELECTOR_PLACEHOLDER')} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
