import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { useUIStore } from '@/stores/ui-store';
import { useTranslation } from 'react-i18next';

export const themeBases = ['slate', 'gray', 'zinc', 'neutral', 'stone'] as const;
export type ThemeBase = (typeof themeBases)[number];

export const baseThemeMap = {
  slate: 'Slate',
  gray: 'Gray',
  zinc: 'Zinc',
  neutral: 'Neutral',
  stone: 'Stone',
};

export const ThemeBaseSelector = () => {
  const { t } = useTranslation();

  const { setThemeBase, themeBase } = useUIStore();

  const onChange = (newBaseTheme: ThemeBase) => {
    setThemeBase(newBaseTheme);
  };

  return (
    <Select value={themeBase} defaultValue="gray" onValueChange={onChange}>
      <SelectTrigger className="mb-3" name="base-theme" label={t('SETTINGS_GENERAL_BASE_THEME')}>
        <SelectValue placeholder="Base Theme" />
      </SelectTrigger>
      <SelectContent>
        {Object.keys(baseThemeMap).map((key) => (
          <SelectItem key={key} value={key}>
            {baseThemeMap[key as ThemeBase]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
