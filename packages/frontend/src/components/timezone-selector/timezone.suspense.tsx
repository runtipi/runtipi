import { useTranslation } from 'react-i18next';
import { Select, SelectTrigger, SelectValue } from '../ui/Select';

export const TimeZoneSuspense = () => {
  const { t } = useTranslation();

  return (
    <Select>
      <SelectTrigger className="mb-3" name="timezone" label={t('TIMEZONE_SELECTOR_LABEL')}>
        <SelectValue placeholder={t('TIMEZONE_SELECTOR_PLACEHOLDER')} />
      </SelectTrigger>
    </Select>
  );
};
