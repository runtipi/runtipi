import { switchColorMode } from '@/lib/theme/view-transition';
import { type ColorMode, useUIStore } from '@/stores/ui-store';
import { IconDeviceDesktop, IconMoon, IconSun, type IconAperture } from '@tabler/icons-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import './color-mode-switch.css';

const MODES: { mode: ColorMode; icon: typeof IconAperture; label: string }[] = [
  { mode: 'light', icon: IconSun, label: 'COLOR_MODE_LIGHT' },
  { mode: 'system', icon: IconDeviceDesktop, label: 'COLOR_MODE_SYSTEM' },
  { mode: 'dark', icon: IconMoon, label: 'COLOR_MODE_DARK' },
];

type Props = {
  className?: string;
  /** Show the mode names next to the icons */
  withLabels?: boolean;
};

/** Light, system or dark. "System" follows the device and is the default. */
export const ColorModeSwitch = ({ className, withLabels }: Props) => {
  const { t } = useTranslation();
  const colorMode = useUIStore((state) => state.colorMode);
  const setColorMode = useUIStore((state) => state.setColorMode);

  const select = (mode: ColorMode) => {
    if (mode !== colorMode) switchColorMode(mode, setColorMode);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next = MODES[(index + (event.key === 'ArrowRight' ? 1 : MODES.length - 1)) % MODES.length];
    if (!next) return;
    select(next.mode);
    (event.currentTarget.parentElement?.querySelector(`[data-mode="${next.mode}"]`) as HTMLButtonElement | null)?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={t('COLOR_MODE_LABEL')}
      className={clsx('rt-cmode', { 'rt-cmode--labels': withLabels }, className)}
      data-testid="color-mode-switch"
    >
      {MODES.map(({ mode, icon: Icon, label }, index) => {
        const checked = colorMode === mode;
        return (
          // biome-ignore lint/a11y/useSemanticElements: icon buttons in a segmented control, arrow keys are handled below
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={withLabels ? undefined : t(label)}
            title={withLabels ? undefined : t(label)}
            tabIndex={checked ? 0 : -1}
            className={clsx('rt-cmode__btn', { 'is-on': checked })}
            data-mode={mode}
            data-testid={`color-mode-${mode}`}
            onClick={() => select(mode)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            <Icon size={16} stroke={1.8} aria-hidden="true" />
            {withLabels && <span>{t(label)}</span>}
          </button>
        );
      })}
    </div>
  );
};
