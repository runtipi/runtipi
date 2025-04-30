import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { locales, type Locale } from '@/lib/i18n/locales';
import { IconExternalLink } from '@tabler/icons-react';
import i18next from 'i18next';
import React from 'react';
import { useTranslation } from 'react-i18next';

type IProps = {
  showLabel?: boolean;
  locale: Locale;
};

const LanguageSelectorLabel = () => {
  const { t } = useTranslation();

  return (
    <span>
      {t('SETTINGS_GENERAL_LANGUAGE')}&nbsp;
      <a href="https://crowdin.com/project/runtipi/invite?h=ae594e86cd807bc075310cab20a4aa921693663" target="_blank" rel="noreferrer">
        {t('SETTINGS_GENERAL_LANGUAGE_HELP_TRANSLATE')}
        <IconExternalLink className="ms-1 mb-1" size={16} />
      </a>
    </span>
  );
};

export const LanguageSelector = (props: IProps) => {
  const { locale: initialLocale } = props;
  const [locale, setLocale] = React.useState<Locale>(initialLocale);
  const { showLabel = false } = props;

  const onChange = (newLocale: Locale) => {
    i18next.changeLanguage(newLocale);
    setLocale(newLocale);
  };

  return (
    <Select value={locale} defaultValue="en-US" onValueChange={onChange}>
      <SelectTrigger className="mb-3" name="language" label={showLabel && <LanguageSelectorLabel />}>
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent>
        {Object.keys(locales).map((key) => (
          <SelectItem key={key} value={key}>
            {locales[key as Locale]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
