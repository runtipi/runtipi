import { render, screen } from '@/tests/test-utils';
import { describe, expect, it } from 'vitest';
import { InputGroup } from './InputGroup';

describe('InputGroup', () => {
  it('uses the visible label as the accessible name when provided', () => {
    render(<InputGroup name="test-input-group" label="Test Group Label" />);

    expect(screen.getByRole('textbox', { name: 'Test Group Label' })).toBeInTheDocument();
  });

  it('uses the field name as the accessible label when no visible label is provided', () => {
    render(<InputGroup name="test-input-group" />);

    expect(screen.getByRole('textbox', { name: 'test-input-group' })).toBeInTheDocument();
  });
});
