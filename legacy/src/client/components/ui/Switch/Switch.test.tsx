import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '../../../../../tests/test-utils';
import { Switch } from './Switch';

describe('Switch', () => {
  it('renders the label', () => {
    // arrange
    const label = 'Test Label';
    render(<Switch label={label} />);

    // assert
    expect(screen.getByRole('switch', { name: label })).toBeInTheDocument();
  });

  it('renders the className', () => {
    // arrange
    const className = 'test-class';
    render(<Switch className={className} />);
    const switchContainer = screen.getByRole('switch').parentElement;

    // assert
    expect(switchContainer).toHaveClass(className);
  });

  it('renders the checked state', () => {
    // arrange
    render(<Switch checked onChange={vi.fn()} />);
    const checkbox = screen.getByRole('switch');

    // assert
    expect(checkbox).toBeChecked();
  });

  it('triggers onChange event when clicked', () => {
    // arrange
    const onChange = vi.fn();
    render(<Switch onCheckedChange={onChange} />);
    const checkbox = screen.getByRole('switch');

    // act
    fireEvent.click(checkbox);

    // assert
    expect(onChange).toHaveBeenCalled();
  });

  it('triggers onBlur event when blurred', () => {
    // arrange
    const onBlur = vi.fn();
    render(<Switch onBlur={onBlur} />);
    const checkbox = screen.getByRole('switch');

    // act
    fireEvent.blur(checkbox);

    // assert
    expect(onBlur).toHaveBeenCalled();
  });

  it('should change the checked state when clicked', () => {
    // arrange
    render(<Switch onChange={vi.fn()} />);
    const checkbox = screen.getByRole('switch');

    // act
    fireEvent.click(checkbox);

    // assert
    expect(checkbox).toBeChecked();
  });
});
