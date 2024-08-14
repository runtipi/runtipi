import { faker } from '@faker-js/faker';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '../../../../../tests/test-utils';
import { OtpInput } from './OtpInput';

describe('<OtpInput />', () => {
  it('should accept value & valueLength props', () => {
    // arrange
    const value = faker.number.int({ min: 0, max: 999999 }).toString();
    const valueArray = value.split('');
    const valueLength = value.length;
    render(<OtpInput value={value} valueLength={valueLength} onChange={() => {}} />);

    const inputEls = screen.queryAllByRole('textbox');

    // assert
    expect(inputEls).toHaveLength(valueLength);
    inputEls.forEach((inputEl, idx) => {
      expect(inputEl).toHaveValue(valueArray[idx]);
    });
  });

  it('should allow typing of digits', () => {
    // arrange
    const valueLength = faker.number.int({ min: 2, max: 6 }); // random number from 2-6 (minimum 2 so it can focus on the next input)
    const onChange = vi.fn();
    render(<OtpInput valueLength={valueLength} onChange={onChange} value="" />);

    const inputEls = screen.queryAllByRole('textbox');

    // assert
    expect(inputEls).toHaveLength(valueLength);
    inputEls.forEach((inputEl, idx) => {
      const digit = faker.number.int({ min: 0, max: 9 }).toString(); // random number from 0-9, typing of digits is 1 by 1

      // trigger a change event
      fireEvent.change(inputEl, {
        target: { value: digit }, // pass it as the target.value in the event data
      });

      // custom matcher to check that "onChange" function was called with the same digit
      expect(onChange).toBeCalledTimes(1);
      expect(onChange).toBeCalledWith(digit);

      const inputFocused = inputEls[idx + 1] || inputEl;
      expect(inputFocused).toHaveFocus();
      onChange.mockReset(); // resets the call times for the next iteration of the loop
    });
  });

  it('should NOT allow typing of non-digits', () => {
    // arrange
    const valueLength = faker.number.int({ min: 2, max: 6 });
    const onChange = vi.fn();
    render(<OtpInput valueLength={valueLength} onChange={onChange} value="" />);

    const inputEls = screen.queryAllByRole('textbox');

    // assert
    expect(inputEls).toHaveLength(valueLength);

    for (const inputEl of inputEls) {
      const nonDigit = faker.number.float(1);

      fireEvent.change(inputEl, {
        target: { value: nonDigit },
      });

      expect(onChange).not.toBeCalled();

      onChange.mockReset();
    }
  });

  it('should allow deleting of digits (focus on previous element)', () => {
    const value = faker.number.int({ min: 10, max: 999999 }).toString(); // minimum 2-digit so it can focus on the previous input
    const valueLength = value.length;
    const lastIdx = valueLength - 1;
    const onChange = vi.fn();

    render(<OtpInput value={value} valueLength={valueLength} onChange={onChange} />);

    const inputEls = screen.queryAllByRole('textbox');

    expect(inputEls).toHaveLength(valueLength);

    for (let idx = lastIdx; idx > -1; idx -= 1) {
      // loop backwards to simulate the focus on the previous input
      const inputEl = inputEls[idx] as HTMLInputElement;
      const target = { value: '' };

      // trigger both change and keydown event
      fireEvent.change(inputEl, { target });
      fireEvent.keyDown(inputEl, {
        target,
        key: 'Backspace',
      });

      const valueArray = value.split('');

      valueArray[idx] = ' '; // the deleted digit is expected to be replaced with a space in the string

      const expectedValue = valueArray.join('');

      expect(onChange).toBeCalledTimes(1);
      expect(onChange).toBeCalledWith(expectedValue);

      // custom matcher to check that the focus is on the previous input
      // OR
      // focus is on the current input if previous input doesn't exist
      const inputFocused = inputEls[idx - 1] || inputEl;

      expect(inputFocused).toHaveFocus();

      onChange.mockReset();
    }
  });

  it('should allow deleting of digits (do NOT focus on previous element)', () => {
    const value = faker.number.int({ min: 10, max: 999999 }).toString();
    const valueArray = value.split('');
    const valueLength = value.length;
    const lastIdx = valueLength - 1;
    const onChange = vi.fn();

    render(<OtpInput value={value} valueLength={valueLength} onChange={onChange} />);

    const inputEls = screen.queryAllByRole('textbox');

    expect(inputEls).toHaveLength(valueLength);

    for (let idx = lastIdx; idx > 0; idx -= 1) {
      // idx > 0, because there's no previous input in index 0
      const inputEl = inputEls[idx] as HTMLInputElement;

      fireEvent.keyDown(inputEl, {
        key: 'Backspace',
        target: { value: valueArray[idx] },
      });

      const prevInputEl = inputEls[idx - 1];

      expect(prevInputEl).not.toHaveFocus();

      onChange.mockReset();
    }
  });

  it('should NOT allow deleting of digits in the middle', () => {
    const value = faker.number.int({ min: 100000, max: 999999 }).toString();
    const valueLength = value.length;
    const onChange = vi.fn();

    render(<OtpInput value={value} valueLength={valueLength} onChange={onChange} />);

    const inputEls = screen.queryAllByRole('textbox');
    const thirdInputEl = inputEls[2] as HTMLInputElement;
    const target = { value: '' };

    fireEvent.change(thirdInputEl, { target: { value: '' } });
    fireEvent.keyDown(thirdInputEl, {
      target,
      key: 'Backspace',
    });

    expect(onChange).not.toBeCalled();
  });

  it('should allow pasting of digits (same length as valueLength)', () => {
    const value = faker.number.int({ min: 10, max: 999999 }).toString(); // minimum 2-digit so it is considered as a paste event
    const valueLength = value.length;
    const onChange = vi.fn();

    render(<OtpInput valueLength={valueLength} onChange={onChange} value="" />);

    const inputEls = screen.queryAllByRole('textbox');

    // get a random input element from the input elements to paste the digits on
    const randomIdx = faker.number.int({ min: 0, max: valueLength - 1 });
    const randomInputEl = inputEls[randomIdx] as HTMLInputElement;

    fireEvent.change(randomInputEl, { target: { value } });

    expect(onChange).toBeCalledTimes(1);
    expect(onChange).toBeCalledWith(value);

    expect(randomInputEl).not.toHaveFocus();
  });

  it('should NOT allow pasting of digits (less than valueLength)', () => {
    const value = faker.number.int({ min: 10, max: 99999 }).toString(); // random 2-5 digit code (less than "valueLength")
    const valueLength = faker.number.int({ min: 6, max: 10 }); // random number from 6-10
    const onChange = vi.fn();

    render(<OtpInput valueLength={valueLength} onChange={onChange} value="" />);

    const inputEls = screen.queryAllByRole('textbox');
    const randomIdx = faker.number.int({ min: 0, max: valueLength - 1 });
    const randomInputEl = inputEls[randomIdx] as HTMLInputElement;

    fireEvent.change(randomInputEl, { target: { value } });

    expect(onChange).not.toBeCalled();
  });

  it('should focus to next element on right/down key', () => {
    render(<OtpInput valueLength={3} onChange={vi.fn} value="1234" />);

    const inputEls = screen.queryAllByRole('textbox');
    const firstInputEl = inputEls[0] as HTMLInputElement;

    fireEvent.keyDown(firstInputEl, {
      key: 'ArrowRight',
    });

    expect(inputEls[1]).toHaveFocus();

    const secondInputEl = inputEls[1] as HTMLInputElement;

    fireEvent.keyDown(secondInputEl, {
      key: 'ArrowDown',
    });

    expect(inputEls[2]).toHaveFocus();
  });

  it('should focus to next element on left/up key', () => {
    render(<OtpInput valueLength={3} onChange={vi.fn} value="1234" />);

    const inputEls = screen.queryAllByRole('textbox');
    const lastInputEl = inputEls[2] as HTMLInputElement;

    fireEvent.keyDown(lastInputEl, {
      key: 'ArrowLeft',
    });

    expect(inputEls[1]).toHaveFocus();

    const secondInputEl = inputEls[1] as HTMLInputElement;

    fireEvent.keyDown(secondInputEl, {
      key: 'ArrowUp',
    });

    expect(inputEls[0]).toHaveFocus();
  });

  it('should only focus to input if previous input has value', () => {
    const valueLength = 6;

    render(<OtpInput valueLength={valueLength} onChange={vi.fn} value="" />);

    const inputEls = screen.queryAllByRole('textbox');
    const lastInputEl = inputEls[valueLength - 1] as HTMLInputElement;

    lastInputEl.focus();

    const firstInputEl = inputEls[0];

    expect(firstInputEl).toHaveFocus();
  });
});
