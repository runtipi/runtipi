import React from 'react';
import { fireEvent, render } from '../../../../../tests/test-utils';
import { Toast } from './Toast';

describe('Toast', () => {
  it('renders the correct title', () => {
    const { getByText } = render(<Toast id="toast-1" title="Test Title" onClose={jest.fn} status="info" />);

    expect(getByText('Test Title')).toBeInTheDocument();
  });

  it('renders the correct message', () => {
    const { getByText } = render(<Toast id="toast-1" title="Test Title" message="Test message" onClose={jest.fn} status="info" />);

    expect(getByText('Test message')).toBeInTheDocument();
  });

  it('renders the correct status', () => {
    const { container } = render(<Toast id="toast-1" title="Test Title" status="success" onClose={jest.fn} />);
    const toastElement = container.querySelector('.tipi-toast');

    expect(toastElement).toHaveClass('alert-success');
  });

  it('calls the correct function when the close button is clicked', () => {
    const onCloseMock = jest.fn();
    const { getByLabelText } = render(<Toast id="toast-1" title="Test Title" onClose={onCloseMock} status="info" />);
    const closeButton = getByLabelText('close');

    fireEvent.click(closeButton);

    expect(onCloseMock).toHaveBeenCalled();
  });
});
