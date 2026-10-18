import { useLocalStorage } from '@uidotdev/usehooks';
import { IconDownload } from '@tabler/icons-react';
import clsx from 'clsx';
import DOMPurify from 'dompurify';
import { type ReactNode, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './logs-terminal.css';

type Props = {
  logs: { id: number; text: string }[];
  maxLines: number;
  onMaxLinesChange: (lines: number) => void;
  /** Shown on the left of the toolbar */
  title?: ReactNode;
  /** Name of the downloaded file, without extension */
  downloadName?: string;
};

const toPlainText = (html: string) => {
  const element = document.createElement('div');
  element.innerHTML = DOMPurify.sanitize(html);
  return element.textContent ?? '';
};

export const LogsTerminal = (props: Props) => {
  const { t } = useTranslation();

  const { logs, onMaxLinesChange, maxLines, title, downloadName = 'logs' } = props;
  const [follow, setFollow] = useLocalStorage<boolean>('logs-follow', true);
  const [wrapLines, setWrapLines] = useLocalStorage<boolean>('logs-wraplines', false);
  const ref = useRef<HTMLPreElement>(null);

  const lastLogId = logs.at(-1)?.id;

  // biome-ignore lint/correctness/useExhaustiveDependencies: necessary to update the scroll when a new log is added
  useEffect(() => {
    if (ref.current && follow) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [lastLogId, follow]);

  const updateMaxLines = (lines: number) => {
    const linesToKeep = Number.isFinite(lines) ? Math.max(1, Math.trunc(lines)) : 1;
    onMaxLinesChange(linesToKeep);
  };

  const download = () => {
    const content = logs.map((log) => toPlainText(log.text)).join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${downloadName}-${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rt-logs">
      <div className="rt-logs__toolbar">
        {title && <div className="rt-logs__title">{title}</div>}
        <div className="rt-logs__controls">
          <span className="rt-logs__toggle">
            <button
              type="button"
              id="follow-logs"
              role="switch"
              className="rt-switch"
              aria-checked={follow}
              aria-labelledby="follow-logs-label"
              onClick={() => setFollow(!follow)}
            />
            <span id="follow-logs-label">{t('APP_LOGS_TAB_FOLLOW')}</span>
          </span>
          <span className="rt-logs__toggle">
            <button
              type="button"
              id="wrap-lines"
              role="switch"
              className="rt-switch"
              aria-checked={wrapLines}
              aria-labelledby="wrap-lines-label"
              onClick={() => setWrapLines(!wrapLines)}
            />
            <span id="wrap-lines-label">{t('APP_LOGS_TAB_WRAP_LINES')}</span>
          </span>
          <label htmlFor="max-lines" className="rt-logs__max">
            {t('APP_LOGS_TAB_MAX_LINES')}
            <input
              id="max-lines"
              type="number"
              className="rt-field rt-mono"
              value={maxLines}
              min={1}
              step={1}
              onChange={(e) => updateMaxLines(Number(e.target.value))}
            />
          </label>
          <button
            type="button"
            className="rt-icon-btn"
            onClick={download}
            disabled={logs.length === 0}
            aria-label={t('LOGS_DOWNLOAD')}
            title={t('LOGS_DOWNLOAD')}
          >
            <IconDownload size={16} stroke={1.8} />
          </button>
        </div>
      </div>
      <pre
        id="log-terminal"
        className={clsx('log-terminal', {
          'wrap-lines': wrapLines,
        })}
        ref={ref}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: safe to use because the content is sanitized
        dangerouslySetInnerHTML={{ __html: logs.map((log) => DOMPurify.sanitize(log.text)).join('<br />') }}
      />
    </div>
  );
};
