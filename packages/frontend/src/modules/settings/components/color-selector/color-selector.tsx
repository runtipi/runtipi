import { useUIStore } from '@/stores/ui-store';
import clsx from 'clsx';
import type React from 'react';

export enum ThemeColor {
  BLUE = 'blue',
  AZURE = 'azure',
  INDIGO = 'indigo',
  PURPLE = 'purple',
  PINK = 'pink',
  RED = 'red',
  ORANGE = 'orange',
  YELLOW = 'yellow',
  LIME = 'lime',
  GREEN = 'green',
}

interface ColorSelectorProps {
  name?: string;
  label?: string;
  className?: string;
}

export const ColorSelector: React.FC<ColorSelectorProps> = ({ name = 'color', label = 'Primary Color', className }) => {
  const handleChange = (color: ThemeColor) => {
    setPrimaryColor(color);
  };

  const setPrimaryColor = useUIStore((state) => state.setPrimaryColor);
  const primaryColor = useUIStore((state) => state.primaryColor) ?? 'blue';

  return (
    <div className={clsx('mb-3', className)}>
      <label className="form-label">{label}</label>
      <div className="row g-2">
        {Object.values(ThemeColor).map((color) => (
          <div className="col-auto" key={color}>
            <label className="form-colorinput">
              <input
                name={name}
                type="radio"
                value={color}
                checked={primaryColor === color}
                onChange={() => handleChange(color)}
                className="form-colorinput-input"
              />
              <span className={clsx('form-colorinput-color', `bg-${color}`, 'rounded-circle')} />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};
