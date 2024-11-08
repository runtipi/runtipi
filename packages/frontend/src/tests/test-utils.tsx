import { type RenderOptions, render, renderHook } from '@testing-library/react';
import ue from '@testing-library/user-event';
import type React from 'react';
import type { FC, ReactElement } from 'react';

const userEvent = ue.setup();

const AllTheProviders: FC<{ children: React.ReactNode }> = ({ children }) => children;

const customRender = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) => render(ui, { wrapper: AllTheProviders, ...options });
const customRenderHook = <Props, Result>(callback: (props: Props) => Result, options?: Omit<RenderOptions, 'wrapper'>) =>
  renderHook(callback, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
export { customRenderHook as renderHook };
export { userEvent };
