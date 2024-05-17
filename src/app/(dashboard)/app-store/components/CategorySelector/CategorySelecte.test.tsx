import React from 'react';
import { vi, describe, it, expect } from 'vitest';
import { CategorySelector } from './CategorySelector';
import { fireEvent, render, screen } from '../../../../../../tests/test-utils';

describe('Test: CategorySelector', () => {
  it('should render without crashing', () => {
    // arrange
    const onSelect = vi.fn();
    const className = 'test-class';

    // act
    render(<CategorySelector onSelect={onSelect} className={className} />);

    // assert
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should call onSelect when an option is selected', () => {
    // arrange
    const onSelect = vi.fn();
    const className = 'test-class';

    render(<CategorySelector onSelect={onSelect} className={className} />);
    const combobox = screen.getByRole('combobox');

    // act
    fireEvent.focus(combobox);
    fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    const listItem = screen.getByText('Network');
    fireEvent.keyDown(listItem, { key: 'Enter' });

    // assert
    expect(onSelect).toHaveBeenCalledWith('network');
  });

  it('should set the initial value when provided', () => {
    // arrange
    const onSelect = vi.fn();
    const className = 'test-class';
    render(<CategorySelector onSelect={onSelect} className={className} initialValue="automation" />);

    // assert
    expect(screen.getByText('Automation')).toBeInTheDocument();
  });
});
