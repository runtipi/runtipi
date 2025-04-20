import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { useUIStore } from '@/stores/ui-store';
import React from 'react';
import { useTranslation } from 'react-i18next';

type IProps = {
  baseTheme: BaseThemes;
};

export const baseThemes = ['slate', 'gray', 'zinc', 'neutral', 'stone'] as const;
export type BaseThemes = (typeof baseThemes)[number];

export const baseThemeMap = {
  slate: 'Slate',
  gray: 'Gray',
  zinc: 'Zinc',
  neutral: 'Neutral',
  stone: 'Stone',
};

export const BaseThemeSelector = (props: IProps) => {
  const { baseTheme: initialBaseTheme } = props;
  const [baseTheme, setBaseTheme] = React.useState<BaseThemes>(initialBaseTheme);
  const { t } = useTranslation();

  const setThemeBase = useUIStore((state) => state.setThemeBase);

  const onChange = (newBaseTheme: BaseThemes) => {
    setThemeBase(newBaseTheme);
    setBaseTheme(newBaseTheme);
  };

  return (
    <Select value={baseTheme} defaultValue="gray" onValueChange={onChange}>
      <SelectTrigger className="mb-3" name="base-theme" label={t('SETTINGS_GENERAL_BASE_THEME')}>
        <SelectValue placeholder="Base Theme" />
      </SelectTrigger>
      <SelectContent>
        {Object.keys(baseThemeMap).map((key) => (
          <SelectItem key={key} value={key}>
            {baseThemeMap[key as BaseThemes]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
