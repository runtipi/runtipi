import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '../../../../../../../tests/test-utils';
import { UpdateModal } from './UpdateModal';

describe('UpdateModal', () => {
  const app = { name: 'My App', id: 'test' };
  const newVersion = '1.2.3';

  it('renders with the correct title and version number', () => {
    // arrange
    render(<UpdateModal info={app} newVersion={newVersion} isOpen onClose={vi.fn()} />);

    // assert
    expect(screen.getByText(`Update ${app.name} ?`)).toBeInTheDocument();
    expect(screen.getByText(`${newVersion}`)).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    // arrange
    render(<UpdateModal info={app} newVersion={newVersion} isOpen={false} onClose={vi.fn()} />);
    const modal = screen.queryByTestId('modal');

    // assert
    expect(modal).not.toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    // arrange
    const onClose = vi.fn();
    render(<UpdateModal info={app} newVersion={newVersion} isOpen onClose={onClose} />);

    // act
    const closeButton = screen.getByTestId('modal-close-button');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });
});
