import clsx from 'clsx';
import type React from 'react';
import { useMemo } from 'react';
import classes from './OtpInput.module.scss';

type Props = {
  value: string;
  valueLength: number;
  onChange: (value: string) => void;
  className?: string;
};

const RE_DIGIT = /^\d+$/;

export const OtpInput = ({ value, valueLength, onChange, className }: Props) => {
  const valueItems = useMemo(() => {
    const valueArray = value.split('');
    const items: string[] = [];

    for (let i = 0; i < valueLength; i += 1) {
      const char = valueArray[i];

      if (char && RE_DIGIT.test(char)) {
        items.push(char);
      } else {
        items.push('');
      }
    }

    return items;
  }, [value, valueLength]);

  const focusToNextInput = (target: HTMLElement) => {
    const nextElementSibling = target.nextElementSibling as HTMLInputElement | null;

    if (nextElementSibling) {
      nextElementSibling.focus();
    }
  };
  const focusToPrevInput = (target: HTMLElement) => {
    const previousElementSibling = target.previousElementSibling as HTMLInputElement | null;

    if (previousElementSibling) {
      previousElementSibling.focus();
    }
  };

  const inputOnChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const { target } = e;
    let targetValue = target.value.trim();
    const isTargetValueDigit = RE_DIGIT.test(targetValue);

    if (!isTargetValueDigit && targetValue !== '') {
      return;
    }

    const nextInputEl = target.nextElementSibling as HTMLInputElement | null;

    // only delete digit if next input element has no value
    if (!isTargetValueDigit && nextInputEl && nextInputEl.value !== '') {
      return;
    }

    targetValue = isTargetValueDigit ? targetValue : ' ';

    const targetValueLength = targetValue.length;

    if (targetValueLength === 1) {
      const newValue = value.substring(0, idx) + targetValue + value.substring(idx + 1);

      onChange(newValue);

      if (!isTargetValueDigit) {
        return;
      }

      focusToNextInput(target);

      const nextElementSibling = target.nextElementSibling as HTMLInputElement | null;

      if (nextElementSibling) {
        nextElementSibling.focus();
      }
    } else if (targetValueLength === valueLength) {
      onChange(targetValue);

      target.blur();
    }
  };

  const inputOnFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const { target } = e;

    const prevInputEl = target.previousElementSibling as HTMLInputElement | null;

    if (prevInputEl && prevInputEl.value === '') {
      return prevInputEl.focus();
    }

    target.setSelectionRange(0, target.value.length);

    return null;
  };

  const inputOnKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { key } = e;
    const target = e.target as HTMLInputElement;

    if (key === 'ArrowRight' || key === 'ArrowDown') {
      e.preventDefault();
      return focusToNextInput(target);
    }

    if (key === 'ArrowLeft' || key === 'ArrowUp') {
      e.preventDefault();
      return focusToPrevInput(target);
    }

    const targetValue = target.value;
    target.setSelectionRange(0, targetValue.length);

    if (e.key !== 'Backspace' || target.value !== '') {
      return null;
    }

    focusToPrevInput(target);

    const previousElementSibling = target.previousElementSibling as HTMLInputElement | null;

    if (previousElementSibling) {
      previousElementSibling.focus();
    }

    return null;
  };

  return (
    <div className={classes.otpGroup}>
      {valueItems.map((digit, idx) => (
        <input
          aria-label={`digit-${idx}`}
          onChange={(e) => inputOnChange(e, idx)}
          onKeyDown={inputOnKeyDown}
          onFocus={inputOnFocus}
          // eslint-disable-next-line react/no-array-index-key
          key={idx}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{1}"
          maxLength={valueLength}
          className={clsx('form-control', classes.otpInput, className)}
          value={digit}
        />
      ))}
    </div>
  );
};
