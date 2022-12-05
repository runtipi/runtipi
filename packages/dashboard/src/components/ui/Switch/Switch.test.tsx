import React from 'react';

import '@testing-library/jest-dom/extend-expect';

import { Switch } from './Switch';
import { fireEvent, render } from '../../../../tests/test-utils';

describe('Switch', () => {
  it('renders the label', () => {
    const label = 'Test Label';
    const { getByText } = render(<Switch label={label} />);

    expect(getByText(label)).toBeInTheDocument();
  });

  it('renders the className', () => {
    const className = 'test-class';
    const { container } = render(<Switch className={className} />);
    const switchContainer = container.querySelector('.test-class');

    expect(switchContainer).toBeInTheDocument();
  });

  it('renders the checked state', () => {
    const { container } = render(<Switch checked onChange={jest.fn} />);
    const checkbox = container.querySelector('input[type="checkbox"]');

    expect(checkbox).toBeChecked();
  });

  it('triggers onChange event when clicked', () => {
    const onChange = jest.fn();
    const { container } = render(<Switch onChange={onChange} />);
    const checkbox = container.querySelector('input[type="checkbox"]') as Element;

    fireEvent.click(checkbox);

    expect(onChange).toHaveBeenCalled();
  });

  it('triggers onBlur event when blurred', () => {
    const onBlur = jest.fn();
    const { container } = render(<Switch onBlur={onBlur} />);
    const checkbox = container.querySelector('input[type="checkbox"]') as Element;

    fireEvent.blur(checkbox);

    expect(onBlur).toHaveBeenCalled();
  });

  it('should change the checked state when clicked', () => {
    const { container } = render(<Switch onChange={jest.fn} />);
    const checkbox = container.querySelector('input[type="checkbox"]') as Element;

    fireEvent.click(checkbox);

    expect(checkbox).toBeChecked();
  });
});
