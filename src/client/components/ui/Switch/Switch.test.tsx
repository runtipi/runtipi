import React from 'react';

import { Switch } from './Switch';
import { fireEvent, render, screen } from '../../../../../tests/test-utils';

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
    render(<Switch checked onChange={jest.fn} />);
    const checkbox = screen.getByRole('switch');

    expect(checkbox).toBeChecked();
  });

  it('triggers onChange event when clicked', () => {
    const onChange = jest.fn();
    render(<Switch onCheckedChange={onChange} />);
    const checkbox = screen.getByRole('switch');

    fireEvent.click(checkbox);

    expect(onChange).toHaveBeenCalled();
  });

  it('triggers onBlur event when blurred', () => {
    const onBlur = jest.fn();
    render(<Switch onBlur={onBlur} />);
    const checkbox = screen.getByRole('switch');

    fireEvent.blur(checkbox);

    expect(onBlur).toHaveBeenCalled();
  });

  it('should change the checked state when clicked', () => {
    render(<Switch onChange={jest.fn} />);
    const checkbox = screen.getByRole('switch');

    fireEvent.click(checkbox);

    expect(checkbox).toBeChecked();
  });
});
