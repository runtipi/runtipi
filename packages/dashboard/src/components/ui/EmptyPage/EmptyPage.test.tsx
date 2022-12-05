import React from 'react';
import { fireEvent, render } from '../../../../tests/test-utils';
import { EmptyPage } from './EmptyPage';

describe('<EmptyPage />', () => {
  it('should render the title and subtitle', () => {
    const { getByText } = render(<EmptyPage title="Title" subtitle="Subtitle" />);

    expect(getByText('Title')).toBeInTheDocument();
    expect(getByText('Subtitle')).toBeInTheDocument();
  });

  it('should render the action button and trigger the onAction callback', () => {
    const onAction = jest.fn();
    const { getByText } = render(<EmptyPage title="Title" onAction={onAction} actionLabel="Action" />);

    expect(getByText('Action')).toBeInTheDocument();

    fireEvent.click(getByText('Action'));
    expect(onAction).toHaveBeenCalled();
  });

  it('should not render the action button if onAction is not provided', () => {
    const { queryByText } = render(<EmptyPage title="Title" actionLabel="Action" />);

    expect(queryByText('Action')).not.toBeInTheDocument();
  });
});
