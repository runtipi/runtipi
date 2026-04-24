import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Markdown } from './markdown';

describe('Markdown', () => {
  it('renders markdown tables and safe html', () => {
    const content = [
      '| Name | Value |',
      '| --- | --- |',
      '| Status | **Ready** |',
      '',
      '<p>Visit <a href="https://runtipi.io">Runtipi</a></p>',
      '<img src="https://example.com/logo.png" alt="Logo" />',
    ].join('\n');

    const html = renderToStaticMarkup(React.createElement(Markdown, { content, className: 'markdown' }));

    expect(html).toContain('<table>');
    expect(html).toContain('<strong>Ready</strong>');
    expect(html).toContain('<p>Visit <a href="https://runtipi.io">Runtipi</a></p>');
    expect(html).toContain('<img src="https://example.com/logo.png" alt="Logo"/>');
  });

  it('sanitizes malicious raw html before rendering', () => {
    const content = [
      'Before <button onclick="alert(1)">Click me</button> After',
      '<script>alert(1)</script>',
      '<img src="https://example.com/logo.png" onerror="alert(1)" />',
      '<a href="javascript:alert(1)">Bad link</a>',
    ].join('\n');

    const html = renderToStaticMarkup(React.createElement(Markdown, { content, className: 'markdown' }));

    expect(html).not.toContain('<button>Click me</button>');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('<img src="https://example.com/logo.png"/>');
    expect(html).toContain('<a>Bad link</a>');
  });
});
