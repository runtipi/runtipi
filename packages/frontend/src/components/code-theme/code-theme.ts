import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { EditorView } from '@uiw/react-codemirror';

// Code blocks stay dark in both themes, like the logs viewer
const chrome = EditorView.theme(
  {
    '&': {
      backgroundColor: 'var(--rt-logbox-bg)',
      color: '#c9c7bb',
      fontSize: '13px',
      borderRadius: '16px',
      border: '1px solid var(--rt-border-subtle)',
      overflow: 'hidden',
    },
    '&.cm-focused': { outline: 'none', borderColor: 'var(--rt-border-strong)' },
    '.cm-scroller': { fontFamily: 'var(--rt-font-mono)', lineHeight: '1.85' },
    '.cm-content': { padding: '16px 0', caretColor: '#ff8a4c' },
    '.cm-gutters': { backgroundColor: 'transparent', color: '#4e5048', border: 'none', paddingLeft: '8px' },
    '.cm-lineNumbers .cm-gutterElement': { minWidth: '36px', paddingRight: '14px' },
    '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: '#151713' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: '#33362f' },
    '.cm-cursor': { borderLeftColor: '#ff8a4c' },
    '.cm-placeholder': { color: '#6b6d62' },
  },
  { dark: true },
);

const highlight = HighlightStyle.define([
  { tag: tags.comment, color: '#6b6d62', fontStyle: 'italic' },
  { tag: [tags.propertyName, tags.definition(tags.propertyName), tags.heading], color: '#f6b680' },
  { tag: [tags.string, tags.special(tags.string)], color: '#86dbae' },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], color: '#aeb8ff' },
  { tag: [tags.keyword, tags.meta, tags.punctuation, tags.separator], color: '#8c8b80' },
  { tag: [tags.link, tags.url], color: '#ffb07f', textDecoration: 'underline' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: '600' },
]);

export const rtCodeTheme = [chrome, syntaxHighlighting(highlight)];
