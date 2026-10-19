import { rtCodeTheme } from '@/components/code-theme/code-theme';
import { unifiedMergeView } from '@codemirror/merge';
import CodeMirror, { EditorView, type Extension } from '@uiw/react-codemirror';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Number of added and removed lines between two texts, from a longest common subsequence of their lines.
 */
export const countLineChanges = (before: string, after: string) => {
  const a = before.split('\n');
  const b = after.split('\n');
  const width = b.length + 1;
  const lcs = new Uint32Array((a.length + 1) * width);

  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i * width + j] =
        a[i] === b[j] ? (lcs[(i + 1) * width + j + 1] ?? 0) + 1 : Math.max(lcs[(i + 1) * width + j] ?? 0, lcs[i * width + j + 1] ?? 0);
    }
  }

  const common = lcs[0] ?? 0;
  return { added: b.length - common, removed: a.length - common };
};

const diffTheme = EditorView.theme(
  {
    '&': { borderRadius: '0', border: 'none' },
    '.cm-changedLine': { backgroundColor: '#14261c' },
    // The merge view's base theme is scoped to dark/light, "&.cm-editor" matches its specificity
    '&.cm-editor .cm-changedText': {
      backgroundColor: '#1f4a33',
      backgroundImage: 'none',
      color: '#c4f2d8',
      borderRadius: '3px',
      textDecoration: 'none',
    },
    '.cm-deletedChunk': { backgroundColor: '#2a1714', paddingLeft: '6px' },
    '&.cm-editor .cm-deletedChunk .cm-deletedText, &.cm-editor .cm-deletedChunk del': {
      backgroundColor: '#5a2a22',
      color: '#ffc2b5',
      borderRadius: '3px',
      backgroundImage: 'none',
      textDecoration: 'none',
    },
    '.cm-changeGutter': { width: '4px', paddingLeft: '0' },
    '.cm-changedLineGutter': { backgroundColor: '#86dbae' },
    '.cm-deletedLineGutter': { backgroundColor: '#ff8a75' },
    '.cm-collapsedLines': {
      padding: '4px 12px',
      backgroundColor: '#151713',
      color: '#6b6d62',
      fontSize: '12px',
      cursor: 'pointer',
      backgroundImage: 'none',
    },
    '.cm-collapsedLines:hover': { backgroundColor: '#1c1e1a', color: '#c9c7bb' },
  },
  { dark: true },
);

type Props = {
  fileName: string;
  before: string;
  after: string;
};

export const DiffView = ({ fileName, before, after }: Props) => {
  const { t } = useTranslation();
  const { added, removed } = useMemo(() => countLineChanges(before, after), [before, after]);

  const extensions = useMemo<Extension[]>(
    // Earlier extensions take precedence, the diff theme overrides the base code theme
    () => [
      diffTheme,
      rtCodeTheme,
      unifiedMergeView({ original: before, mergeControls: false, highlightChanges: true, collapseUnchanged: { margin: 2, minSize: 4 } }),
    ],
    [before],
  );

  return (
    <div className="rt-diff">
      <div className="rt-diff__head">
        <span className="rt-diff__file rt-mono">{fileName}</span>
        <span className="rt-mono rt-diff__counts">
          <span className="rt-diff__add">+{added}</span> <span className="rt-diff__del">−{removed}</span>
        </span>
        <span className="rt-diff__hint">{t('APP_UPDATE_COLLAPSED')}</span>
      </div>
      {added + removed === 0 ? (
        <p className="rt-diff__empty">{t('APP_UPDATE_NO_CHANGES')}</p>
      ) : (
        <CodeMirror
          value={after}
          readOnly
          editable={false}
          maxHeight="440px"
          theme="none"
          basicSetup={{ foldGutter: false, highlightActiveLine: false, highlightActiveLineGutter: false }}
          extensions={extensions}
        />
      )}
    </div>
  );
};
