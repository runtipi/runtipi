import React from 'react';
import { fireEvent, render, renderHook, screen, waitFor } from '../../../../../tests/test-utils';
import { useUIStore } from '../../../state/uiStore';
import { Header } from './Header';

const pushFn = jest.fn();
jest.mock('next/router', () => {
  const actualRouter = jest.requireActual('next-router-mock');

  return {
    ...actualRouter,
    useRouter: () => ({
      ...actualRouter.useRouter(),
      push: pushFn,
    }),
  };
});

describe('Header', () => {
  it('renders without crashing', () => {
    render(<Header />);
  });

  it('renders the brand logo', () => {
    const { container } = render(<Header />);
    expect(container).toHaveTextContent('Tipi');
    expect(container).toContainElement(screen.getByAltText('Tipi logo'));
  });

  it('renders the dark mode toggle', () => {
    render(<Header />);
    const darkModeToggle = screen.getByTestId('dark-mode-toggle');
    expect(darkModeToggle).toContainElement(screen.getByTestId('icon-moon'));
  });

  it('renders the light mode toggle', () => {
    render(<Header />);
    const lightModeToggle = screen.getByTestId('light-mode-toggle');
    expect(lightModeToggle).toContainElement(screen.getByTestId('icon-sun'));
  });

  it('Should toggle the dark mode on click of the dark mode toggle', () => {
    const { result } = renderHook(() => useUIStore());

    render(<Header />);
    const darkModeToggle = screen.getByTestId('dark-mode-toggle');
    fireEvent.click(darkModeToggle as Element);

    expect(result.current.darkMode).toBe(true);
  });

  it('Should toggle the dark mode on click of the light mode toggle', () => {
    const { result } = renderHook(() => useUIStore());

    render(<Header />);
    const lightModeToggle = screen.getByTestId('light-mode-toggle');
    fireEvent.click(lightModeToggle as Element);

    expect(result.current.darkMode).toBe(false);
  });

  it('Should redirect to /login after successful logout', async () => {
    render(<Header />);
    const logoutButton = screen.getByTestId('logout-button');
    fireEvent.click(logoutButton as Element);

    await waitFor(() => {
      expect(pushFn).toHaveBeenCalledWith('/login');
    });
  });
});
