import type * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import clsx from 'clsx';
import { useId } from 'react';

type RootProps = typeof CheckboxPrimitive.Root;

type CheckboxProps = React.ComponentPropsWithoutRef<RootProps> & {
  label?: string | React.ReactNode;
  ref?: React.Ref<React.ElementRef<RootProps>>;
};

function Checkbox({ className, label, ...props }: CheckboxProps) {
  const generatedId = useId();
  const baseId = props.name ? `${props.name}-${generatedId}` : generatedId;
  const inputId = props.id || baseId;
  const labelId = `${baseId}-label`;

  return (
    <label htmlFor={inputId} className={clsx('form-check', className)}>
      <input
        type="checkbox"
        className="form-check-input"
        checked={props.checked as boolean}
        onChange={(e) => props.onCheckedChange?.(e.target.checked)}
        name={props.name}
        id={inputId}
        aria-labelledby={labelId}
      />
      <span id={labelId} className="form-check-label text-muted">
        {label}
      </span>
    </label>
  );
}

export { Checkbox };
