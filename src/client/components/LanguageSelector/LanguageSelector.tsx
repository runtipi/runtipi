import React from 'react';
import { useLocale } from '@/client/hooks/useLocale';
import { LOCALE_OPTIONS, Locale } from '@/shared/internationalization/locales';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';

export const LanguageSelector = () => {
  const { locale, changeLocale } = useLocale();

  const onChange = (value: Locale) => {
    changeLocale(value);
  };

  return (
    <Select value={locale} defaultValue={locale} onValueChange={onChange}>
      <SelectTrigger className="mb-3" label="">
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
