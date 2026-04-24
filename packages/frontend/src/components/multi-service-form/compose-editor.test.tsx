import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@/tests/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMultiServiceStore } from '@/stores/multiServiceStore';
import { ComposeEditor } from './compose-editor';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@codemirror/lang-yaml', () => ({
  yaml: () => [],
}));

vi.mock('@codemirror/lang-json', () => ({
  json: () => [],
}));

vi.mock('@uiw/codemirror-theme-copilot', () => ({
  copilot: {},
}));

vi.mock('@uiw/react-codemirror', () => ({
  default: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea aria-label="compose-editor" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));

vi.mock('@/components/ui/tabs/tabs', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  const TabsContext = React.createContext<{
    onValueChange: (value: string) => void;
    value: string;
  }>({
    onValueChange: () => {},
    value: '',
  });

  return {
    Tabs: ({ children, onValueChange, value }: { children: ReactNode; onValueChange: (value: string) => void; value: string }) => (
      <TabsContext.Provider value={{ value, onValueChange }}>{children}</TabsContext.Provider>
    ),
    TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    TabsTrigger: ({ children, disabled, value }: { children: ReactNode; disabled?: boolean; value: string }) => {
      const context = React.useContext(TabsContext);

      return (
        <button type="button" disabled={disabled} onClick={() => context.onValueChange(value)}>
          {children}
        </button>
      );
    },
  };
});

describe('ComposeEditor', () => {
  beforeEach(() => {
    useMultiServiceStore.getState().resetToDefaults();
    useMultiServiceStore.getState().setComposeExtras({});
  });

  it('preserves unsaved YAML extras when switching to JSON and back', () => {
    render(<ComposeEditor onChange={vi.fn()} />);

    const yamlEditor = screen.getByRole('textbox', { name: 'compose-editor' }) as HTMLTextAreaElement;
    fireEvent.change(yamlEditor, {
      target: {
        value: `${yamlEditor.value.trimEnd()}\nvolumes:\n  app_data:\n`,
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'JSON' }));
    fireEvent.click(screen.getByRole('button', { name: 'YAML' }));

    const roundTripYamlEditor = screen.getByRole('textbox', { name: 'compose-editor' }) as HTMLTextAreaElement;

    expect(roundTripYamlEditor.value).toContain('volumes:');
    expect(roundTripYamlEditor.value).toContain('  app_data:');
  });
});
