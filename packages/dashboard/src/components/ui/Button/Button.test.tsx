import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { Button } from './Button';

afterEach(cleanup);

describe('Button component', () => {
  it('should render without crashing', () => {
    const { container } = render(<Button>Click me</Button>);
    expect(container).toBeTruthy();
  });

  it('should render children correctly', () => {
    const { getByText } = render(<Button>Click me</Button>);
    expect(getByText('Click me')).toBeInTheDocument();
  });

  it('should apply className prop correctly', () => {
    const { container } = render(<Button className="test-class">Click me</Button>);
    expect(container.querySelector('button')).toHaveClass('test-class');
  });

  it('should render spinner when loading prop is true', () => {
    const { container } = render(<Button loading>Click me</Button>);
    expect(container.querySelector('.spinner-border')).toBeInTheDocument();
  });

  it('should disable button when disabled prop is true', () => {
    const { container } = render(<Button disabled>Click me</Button>);
    expect(container.querySelector('button')).toBeDisabled();
  });

  it('should set type correctly', () => {
    const { container } = render(<Button type="submit">Click me</Button>);
    expect(container.querySelector('button')).toHaveAttribute('type', 'submit');
  });

  it('should applies width correctly', () => {
    const { container } = render(<Button width={100}>Click me</Button>);
    expect(container.querySelector('button')).toHaveStyle('width: 100px');
  });

  it('should call onClick callback when clicked', () => {
    const onClick = jest.fn();
    const { container } = render(<Button onClick={onClick}>Click me</Button>);
    fireEvent.click(container.querySelector('button') as HTMLButtonElement);
    expect(onClick).toHaveBeenCalled();
  });
});
