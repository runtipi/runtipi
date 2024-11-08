import { describe, expect, it } from 'vitest';
import { DataGrid } from './DataGrid';
import { DataGridItem } from './DataGridItem';
import { render, screen } from '@/tests/test-utils';

describe('DataGrid', () => {
  it('should renders its children', () => {
    // arrange
    render(<DataGrid>Test child</DataGrid>);

    // assert
    expect(screen.getByText('Test child')).toBeInTheDocument();
  });
});

describe('DataGridItem', () => {
  it('renders its children', () => {
    // arrange
    render(<DataGridItem title="">Test child</DataGridItem>);

    // assert
    expect(screen.getByText('Test child')).toBeInTheDocument();
  });

  it('renders the correct title', () => {
    // arrange
    render(<DataGridItem title="Test Title">Hello</DataGridItem>);

    // assert
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });
});
