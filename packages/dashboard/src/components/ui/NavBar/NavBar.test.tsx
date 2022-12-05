import { useRouter } from 'next/router';
import React from 'react';
import { render } from '../../../../tests/test-utils';
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
    const { getByText } = render(<NavBar isUpdateAvailable />);

    expect(getByText('Dashboard')).toBeInTheDocument();
    expect(getByText('My Apps')).toBeInTheDocument();
    expect(getByText('App Store')).toBeInTheDocument();
    expect(getByText('Settings')).toBeInTheDocument();
  });

  it('should highlight the active navbar item', () => {
    (useRouter as jest.Mock).mockImplementation(() => ({
      pathname: '/app-store',
    }));

    const { getByTestId } = render(<NavBar isUpdateAvailable />);
    const activeItem = getByTestId('nav-item-app-store');
    const inactiveItem = getByTestId('nav-item-settings');

    expect(activeItem.classList.contains('active')).toBe(true);
    expect(inactiveItem.classList.contains('active')).toBe(false);
  });

  it('should render the update available badge', () => {
    const { getByText } = render(<NavBar isUpdateAvailable />);

    expect(getByText('Update available')).toBeInTheDocument();
  });

  it('should not render the update available badge', () => {
    const { queryByText } = render(<NavBar isUpdateAvailable={false} />);

    expect(queryByText('Update available')).toBeNull();
  });
});
