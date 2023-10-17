import React from 'react';
import { CategorySelector } from './CategorySelector';
import { fireEvent, render, screen } from '../../../../../../tests/test-utils';

describe('Test: CategorySelector', () => {
  it('should render without crashing', () => {
    // arrange
    const onSelect = jest.fn();
    const className = 'test-class';

    // act
    render(<CategorySelector onSelect={onSelect} className={className} />);

    // assert
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should call onSelect when an option is selected', () => {
    // arrange
    const onSelect = jest.fn();
    const className = 'test-class';

    render(<CategorySelector onSelect={onSelect} className={className} />);
    const combobox = screen.getByRole('combobox');

    // act
    fireEvent.input(combobox, { target: { value: 'automation' } });
    const listItem = screen.getByText('Automation');
    fireEvent.click(listItem);

    // assert
    expect(onSelect).toHaveBeenCalledWith('automation');
  });

  it('should set the initial value when provided', () => {
    // arrange
    const onSelect = jest.fn();
    const className = 'test-class';
    render(<CategorySelector onSelect={onSelect} className={className} initialValue="automation" />);

    // assert
    expect(screen.getByText('Automation')).toBeInTheDocument();
  });
});
