import { useRouter } from 'next/router';
import React from 'react';
import { render, screen } from '../../../../../tests/test-utils';
import { NavBar } from './NavBar';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

describe('<NavBar />', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockImplementation(() => ({
      pathname: '/',
    }));
  });

  it('should render the navbar items', () => {
    // arrange
    render(<NavBar isUpdateAvailable />);

    // assert
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('My Apps')).toBeInTheDocument();
    expect(screen.getByText('App Store')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should highlight the active navbar item', () => {
    // arrange
    (useRouter as jest.Mock).mockImplementation(() => ({
      pathname: '/app-store',
    }));
    render(<NavBar isUpdateAvailable />);
    const activeItem = screen.getByRole('listitem', { name: 'App Store' });
    const inactiveItem = screen.getByRole('listitem', { name: 'Dashboard' });

    // assert
    expect(activeItem).toHaveClass('active');
    expect(inactiveItem).not.toHaveClass('active');
  });

  it('should render the update available badge', () => {
    // arrange
    render(<NavBar isUpdateAvailable />);

    // assert
    expect(screen.getByText('Update available')).toBeInTheDocument();
  });

  it('should not render the update available badge', () => {
    // arrange
    render(<NavBar isUpdateAvailable={false} />);

    // assert
    expect(screen.queryByText('Update available')).not.toBeInTheDocument();
  });
});
