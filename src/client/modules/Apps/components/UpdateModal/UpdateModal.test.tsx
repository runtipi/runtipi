import React from 'react';
import { fireEvent, render, screen } from '../../../../../../tests/test-utils';
import { UpdateModal } from './UpdateModal';

describe('UpdateModal', () => {
  const app = { name: 'My App' };
  const newVersion = '1.2.3';

  it('renders with the correct title and version number', () => {
    // Arrange
    render(<UpdateModal info={app} newVersion={newVersion} isOpen onClose={jest.fn()} onConfirm={jest.fn()} />);

    // Assert
    expect(screen.getByText(`Update ${app.name} ?`)).toBeInTheDocument();
    expect(screen.getByText(`${newVersion}`)).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    // Arrange
    render(<UpdateModal info={app} newVersion={newVersion} isOpen={false} onClose={jest.fn()} onConfirm={jest.fn()} />);
    const modal = screen.queryByTestId('modal');

    // Assert (modal should have style display: none)
    expect(modal).toHaveStyle('display: none');
  });

  it('calls onClose when the close button is clicked', () => {
    // Arrange
    const onClose = jest.fn();
    render(<UpdateModal info={app} newVersion={newVersion} isOpen onClose={onClose} onConfirm={jest.fn()} />);

    // Act
    const closeButton = screen.getByTestId('modal-close-button');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onConfirm when the update button is clicked', () => {
    // Arrange
    const onConfirm = jest.fn();
    render(<UpdateModal info={app} newVersion={newVersion} isOpen onClose={jest.fn()} onConfirm={onConfirm} />);

    // Act
    const updateButton = screen.getByText('Update');
    fireEvent.click(updateButton);
    expect(onConfirm).toHaveBeenCalled();
  });
});
