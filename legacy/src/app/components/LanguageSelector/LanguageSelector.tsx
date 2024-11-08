'use client';

import { changeLocaleAction } from '@/actions/change-locale/change-locale-action';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { LOCALE_OPTIONS, type Locale } from '@/shared/internationalization/locales';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import React from 'react';
import { LanguageSelectorLabel } from './LanguageSelectorLabel';

type IProps = {
  showLabel?: boolean;
  locale: Locale;
};

export const LanguageSelector = (props: IProps) => {
  const { locale: initialLocale } = props;
  const [locale, setLocale] = React.useState<Locale>(initialLocale);
  const { showLabel = false } = props;
  const router = useRouter();

  const { execute } = useAction(changeLocaleAction, { onSuccess: () => router.refresh() });

  const onChange = (newLocale: Locale) => {
    setLocale(newLocale);
    execute({ newLocale });
  };

  return (
    <Select value={locale} defaultValue="en-US" onValueChange={onChange}>
      <SelectTrigger className="mb-3" name="language" label={showLabel && <LanguageSelectorLabel />}>
        <SelectValue placeholder="Language" />
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
