import clsx from 'clsx';
import type React from 'react';

export const THEME_COLOR_ENUM = {
  blue: 'blue',
  azure: 'azure',
  indigo: 'indigo',
  purple: 'purple',
  pink: 'pink',
  red: 'red',
  orange: 'orange',
  yellow: 'yellow',
  lime: 'lime',
  green: 'green',
  teal: 'teal',
  cyan: 'cyan',
} as const;
export type ThemeColor = (typeof THEME_COLOR_ENUM)[keyof typeof THEME_COLOR_ENUM];

interface ColorSelectorProps {
  name?: string;
  label?: string;
  className?: string;
  value?: ThemeColor;
  onChange?: (value: ThemeColor) => void;
}

export const ColorSelector: React.FC<ColorSelectorProps> = ({ name = 'color', label = 'Primary Color', className, value, onChange }) => {
  const handleChange = (color: ThemeColor) => {
    document.body.dataset.bsThemePrimary = color;

    if (onChange) {
      onChange(color);
    }
  };

  return (
    <div className={clsx('mb-3', className)} id={`${name}-group`}>
      <label className="form-label" htmlFor={`${name}-group`}>
        {label}
      </label>
      <div className="row g-2">
        {Object.values(THEME_COLOR_ENUM).map((color) => (
          <div className="col-auto" key={color}>
            <label className="form-colorinput">
              <input
                name={name}
                type="radio"
                value={color}
                checked={value === color}
                onChange={() => handleChange(color)}
                className="form-colorinput-input"
              />
              <span className={clsx('form-colorinput-color', `bg-${color}`, 'rounded-circle')} />
              <span className="visually-hidden">{color}</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};
