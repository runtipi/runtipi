import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { useTranslation } from 'react-i18next';
import { allTimezones, useTimezoneSelect } from 'react-timezone-select';
import './timezone-selector.css';

type IProps = {
  timeZone?: string;
  onChange: (timeZone: string) => void;
};

export const TimeZoneSelector = (props: IProps) => {
  const { onChange, timeZone } = props;
  const { options, parseTimezone } = useTimezoneSelect({ labelStyle: 'abbrev', timezones: allTimezones });
  const { t } = useTranslation();

  const selectedTimezone = parseTimezone(timeZone || 'Etc/GMT') || parseTimezone('Etc/GMT');
  let displayedOptions = options;

  if (!options.some((option) => option.value === selectedTimezone.value)) {
    displayedOptions = [selectedTimezone, ...options];
  }

  const onTimezoneChange = (e: string) => {
    if (!e) return;
    onChange(e);
  };

  return (
    <Select value={selectedTimezone.value} onValueChange={onTimezoneChange}>
      <SelectTrigger className="mb-3" name="timezone" label={t('TIMEZONE_SELECTOR_LABEL')}>
        <SelectValue placeholder={t('TIMEZONE_SELECTOR_PLACEHOLDER')} />
      </SelectTrigger>
      <SelectContent className="select-content">
        {displayedOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
