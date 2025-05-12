import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { useTranslation } from 'react-i18next';

export const THEME_BASE_ENUM = {
  slate: 'slate',
  gray: 'gray',
  zinc: 'zinc',
  neutral: 'neutral',
  stone: 'stone',
} as const;
export type ThemeBase = (typeof THEME_BASE_ENUM)[keyof typeof THEME_BASE_ENUM];

export const ThemeBaseSelector = ({ value, onChange }: { value?: ThemeBase; onChange?: (value: ThemeBase) => void }) => {
  const { t } = useTranslation();

  const handleChange = (newBaseTheme: ThemeBase) => {
    document.body.dataset.bsThemeBase = newBaseTheme;

    if (onChange) {
      onChange(newBaseTheme);
    }
  };

  return (
    <Select value={value} defaultValue="gray" onValueChange={handleChange}>
      <SelectTrigger className="mb-3" name="base-theme" label={t('SETTINGS_GENERAL_BASE_THEME')}>
        <SelectValue placeholder="Base Theme" />
      </SelectTrigger>
      <SelectContent>
        {Object.keys(THEME_BASE_ENUM).map((key) => (
          <SelectItem key={key} value={key}>
            {THEME_BASE_ENUM[key as ThemeBase].charAt(0).toUpperCase() + THEME_BASE_ENUM[key as ThemeBase].slice(1)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
