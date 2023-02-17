import React from 'react';
import { render } from '../../../../../tests/test-utils';
import { DataGrid } from './DataGrid';
import { DataGridItem } from './DataGridItem';

describe('DataGrid', () => {
  it('renders its children', () => {
    const { getByText } = render(
      <DataGrid>
        <p>Test child</p>
      </DataGrid>,
    );

    expect(getByText('Test child')).toBeInTheDocument();
  });
});

describe('DataGridItem', () => {
  it('renders its children', () => {
    const { getByText } = render(
      <DataGridItem title="">
        <p>Test child</p>
      </DataGridItem>,
    );

    expect(getByText('Test child')).toBeInTheDocument();
  });

  it('renders the correct title', () => {
    const { getByText } = render(<DataGridItem title="Test Title">Hello</DataGridItem>);
    expect(getByText('Test Title')).toBeInTheDocument();
  });
});
