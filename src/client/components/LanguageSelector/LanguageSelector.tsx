import React from 'react';
import { useLocale } from '@/client/hooks/useLocale';
import { LOCALE_OPTIONS, Locale } from '@/shared/internationalization/locales';
import { useTranslations } from 'next-intl';
import { IconExternalLink } from '@tabler/icons-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';

type IProps = {
  showLabel?: boolean;
};

export const LanguageSelector = (props: IProps) => {
  const { showLabel = false } = props;
  const t = useTranslations('settings.settings');
  const { locale, changeLocale } = useLocale();

  const onChange = (value: Locale) => {
    changeLocale(value);
  };

  return (
    <Select value={locale} defaultValue={locale} onValueChange={onChange}>
      <SelectTrigger
        className="mb-3"
        label={
          showLabel && (
            <span>
              {t('language')}&nbsp;
              <a href="https://crowdin.com/project/runtipi/invite?h=ae594e86cd807bc075310cab20a4aa921693663" target="_blank" rel="noreferrer">
                {t('help-translate')}
                <IconExternalLink className="ms-1 mb-1" size={16} />
              </a>
            </span>
          )
        }
      >
        <SelectValue placeholder="test" />
      </SelectTrigger>
      <SelectContent>
        {LOCALE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
