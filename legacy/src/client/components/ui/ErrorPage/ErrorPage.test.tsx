import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '../../../../../tests/test-utils';
import { ErrorPage } from './ErrorPage';

describe('ErrorPage', () => {
  it('should render the error message', () => {
    const errorMessage = 'There was an error';
    render(<ErrorPage error={errorMessage} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('should render the retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    render(<ErrorPage onRetry={onRetry} />);

    expect(screen.getByTestId('error-page-action')).toBeInTheDocument();
  });

  it('should not render the retry button when onRetry is not provided', () => {
    render(<ErrorPage />);

    expect(screen.queryByTestId('error-page-action')).not.toBeInTheDocument();
  });

  it('should call the onRetry callback when the retry button is clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorPage onRetry={onRetry} />);

    fireEvent.click(screen.getByTestId('error-page-action'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
