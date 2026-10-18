import clsx from 'clsx';
import type { ReactNode } from 'react';
import './settings-ui.css';

type PanelProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Shown on the right of the title, e.g. a switch or a button */
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export const SettingsPanel = ({ title, description, action, children, className }: PanelProps) => (
  <section className={clsx('rt-panel rt-set-panel', className)}>
    <div className="rt-set-panel__head">
      <div className="rt-set-panel__title">
        <h2 className="rt-display">{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="rt-set-panel__action">{action}</div>}
    </div>
    {children}
  </section>
);

type RowProps = {
  label: ReactNode;
  description?: ReactNode;
  htmlFor?: string;
  error?: string;
  /** The control is a switch, kept on the label line on small screens */
  inline?: boolean;
  children: ReactNode;
};

export const SettingRow = ({ label, description, htmlFor, error, inline, children }: RowProps) => (
  <div className={clsx('rt-set-row', { 'rt-set-row--inline': inline })}>
    <div className="rt-set-row__label">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="rt-set-row__title">
          {label}
        </label>
      ) : (
        <div className="rt-set-row__title">{label}</div>
      )}
      {description && <div className="rt-set-row__desc">{description}</div>}
    </div>
    <div className="rt-set-row__control">
      {children}
      {error && <div className="rt-set-row__error">{error}</div>}
    </div>
  </div>
);

type SwitchProps = {
  checked?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id?: string;
  disabled?: boolean;
};

export const RtSwitch = ({ checked = false, onChange, label, id, disabled }: SwitchProps) => (
  <button
    type="button"
    id={id}
    role="switch"
    className="rt-switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
  />
);

/** Accent colors offered in the settings, matching the values in theme.css */
export const ACCENT_SWATCHES = [
  { id: 'orange', color: '#ff7a3d' },
  { id: 'red', color: '#ff6b5a' },
  { id: 'yellow', color: '#f2b33d' },
  { id: 'lime', color: '#b8d95b' },
  { id: 'green', color: '#7fd6a6' },
  { id: 'teal', color: '#5cc8c2' },
  { id: 'azure', color: '#6fb2f2' },
  { id: 'indigo', color: '#9a8cff' },
  { id: 'purple', color: '#b18cf0' },
  { id: 'pink', color: '#e08ad8' },
] as const;

type SwatchesProps = {
  value?: string;
  onChange: (value: string) => void;
  label: string;
};

export const AccentSwatches = ({ value, onChange, label }: SwatchesProps) => (
  <div className="rt-swatches" role="radiogroup" aria-label={label}>
    {ACCENT_SWATCHES.map((swatch) => (
      <label key={swatch.id} title={swatch.id} className={clsx('rt-swatch', { 'is-on': value === swatch.id })} style={{ background: swatch.color }}>
        <input
          type="radio"
          className="rt-sr"
          name="accent-color"
          value={swatch.id}
          checked={value === swatch.id}
          aria-label={swatch.id}
          onChange={() => onChange(swatch.id)}
        />
      </label>
    ))}
  </div>
);
