import React from 'react';
import { fireEvent, render, renderHook, screen } from '../../../../tests/test-utils';
import { useUIStore } from '../../../state/uiStore';
import { Header } from './Header';

const logoutFn = jest.fn();
const reloadFn = jest.fn();

jest.mock('../../../generated/graphql', () => ({
  useLogoutMutation: () => [logoutFn],
}));

jest.mock('next/router', () => {
  const actualRouter = jest.requireActual('next-router-mock');

  return {
    ...actualRouter,
    reload: () => reloadFn(),
  };
});

describe('Header', () => {
  it('renders without crashing', () => {
    const { container } = render(<Header />);
    expect(container).toBeInTheDocument();
  });

  it('renders the brand logo', () => {
    const { container } = render(<Header />);
    expect(container).toHaveTextContent('Tipi');
    expect(container).toContainElement(screen.getByAltText('Tipi logo'));
  });

  it('renders the dark mode toggle', () => {
    const { container } = render(<Header />);
    const darkModeToggle = container.querySelector('[data-tip="Dark mode"]');
    expect(darkModeToggle).toContainElement(screen.getByTestId('icon-moon'));
  });

  it('renders the light mode toggle', () => {
    const { container } = render(<Header />);
    const lightModeToggle = container.querySelector('[data-tip="Light mode"]');
    expect(lightModeToggle).toContainElement(screen.getByTestId('icon-sun'));
  });

  it('Should toggle the dark mode on click of the dark mode toggle', () => {
    const { result } = renderHook(() => useUIStore());

    const { container } = render(<Header />);
    const darkModeToggle = container.querySelector('[data-tip="Dark mode"]');
    fireEvent.click(darkModeToggle as Element);

    expect(result.current.darkMode).toBe(true);
  });

  it('Should toggle the dark mode on click of the light mode toggle', () => {
    const { result } = renderHook(() => useUIStore());

    const { container } = render(<Header />);
    const lightModeToggle = container.querySelector('[data-tip="Light mode"]');
    fireEvent.click(lightModeToggle as Element);

    expect(result.current.darkMode).toBe(false);
  });

  it('Should call the logout mutation on logout', () => {
    const { container } = render(<Header />);
    const logoutButton = container.querySelector('[data-tip="Log out"]');
    fireEvent.click(logoutButton as Element);

    expect(logoutFn).toHaveBeenCalled();
  });

  it('Should reload the page with next/router on logout', () => {
    const { container } = render(<Header />);
    const logoutButton = container.querySelector('[data-tip="Log out"]');
    fireEvent.click(logoutButton as Element);

    expect(reloadFn).toHaveBeenCalledTimes(1);
  });
});
