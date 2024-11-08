import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '../../../../../tests/test-utils';
import { EmptyPage } from './EmptyPage';

describe('<EmptyPage />', () => {
  it('should render the title and subtitle', () => {
    // arrange
    render(<EmptyPage title="Title" subtitle="Subtitle" />);

    // assert
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Subtitle')).toBeInTheDocument();
  });

  it('should render the action button and trigger the onAction callback', () => {
    // arrange
    const onAction = vi.fn();
    render(<EmptyPage title="Title" onAction={onAction} actionLabel="Action" />);

    // act
    fireEvent.click(screen.getByText('Action'));

    // assert
    expect(onAction).toHaveBeenCalled();
  });

  it('should not render the action button if onAction is not provided', () => {
    // arrange
    render(<EmptyPage title="Title" actionLabel="Action" />);

    // assert
    expect(screen.queryByText('Action')).not.toBeInTheDocument();
  });
});
