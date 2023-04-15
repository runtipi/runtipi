import React from 'react';
import { fireEvent, screen, render } from '../../../../../tests/test-utils';
import { Toast } from './Toast';

describe('Toast', () => {
  it('renders the correct title', () => {
    // arrange
    render(<Toast id="toast-1" title="Test Title" onClose={jest.fn} status="info" />);

    // assert
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders the correct message', () => {
    // arrange
    render(<Toast id="toast-1" title="Test Title" message="Test message" onClose={jest.fn} status="info" />);

    // assert
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders the correct status', () => {
    // arrange
    render(<Toast id="toast-1" title="Test Title" status="success" onClose={jest.fn} />);
    const toastElement = screen.getByRole('alert');

    // assert
    expect(toastElement).toHaveClass('alert-success');
  });

  it('calls the correct function when the close button is clicked', () => {
    // arrange
    const onCloseMock = jest.fn();
    render(<Toast id="toast-1" title="Test Title" onClose={onCloseMock} status="info" />);
    const closeButton = screen.getByRole('button', { name: 'close' });

    // act
    fireEvent.click(closeButton);

    // assert
    expect(onCloseMock).toHaveBeenCalled();
  });
});
