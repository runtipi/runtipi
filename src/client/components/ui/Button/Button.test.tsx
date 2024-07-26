import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { vi, expect, describe, it } from 'vitest';
import { Button } from './Button';

describe('Button component', () => {
  it('should render without crashing', () => {
    render(<Button>Click me</Button>);
  });

  it('should render children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should apply className prop correctly', () => {
    // arrange
    render(<Button className="test-class">Click me</Button>);
    const button = screen.getByRole('button');

    // assert
    expect(button).toHaveClass('test-class');
  });

  it('should disable button when disabled prop is true', () => {
    // arrange
    render(<Button disabled>Click me</Button>);
    const button = screen.getByRole('button');

    // assert
    expect(button).toBeDisabled();
  });

  it('should set type correctly', () => {
    // arrange
    render(<Button type="submit">Click me</Button>);
    const button = screen.getByRole('button');

    // assert
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('should call onClick callback when clicked', () => {
    // arrange
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    const button = screen.getByRole('button');

    // act
    fireEvent.click(button);

    // assert
    expect(onClick).toHaveBeenCalled();
  });
});
