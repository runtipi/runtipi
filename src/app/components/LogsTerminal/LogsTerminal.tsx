'use client';

import { useLocalStorage } from '@uidotdev/usehooks';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import React, { useEffect, useRef } from 'react';
import styles from './LogsTerminal.module.scss';

type Props = {
  logs: { id: number; text: string }[];
  maxLines: number;
  onMaxLinesChange: (lines: number) => void;
};

export const LogsTerminal = (props: Props) => {
  const t = useTranslations();

  const { logs, onMaxLinesChange, maxLines } = props;
  const [follow, setFollow] = useLocalStorage<boolean>('logs-follow', true);
  const [wrapLines, setWrapLines] = useLocalStorage<boolean>('logs-wraplines', false);
  const ref = useRef<HTMLPreElement>(null);

  const lastLogId = logs.length > 0 ? logs.at(-1)?.id : null;

  useEffect(() => {
    if (ref.current && follow) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [lastLogId, follow]);

  const updateMaxLines = (lines: number) => {
    const linesToKeep = Math.max(1, lines);
    onMaxLinesChange(linesToKeep);
  };

  return (
    <div>
      <div className="row d-flex align-items-center ps-1">
        <div className="col">
          <label className="form-check form-switch mt-1" htmlFor="follow-logs">
            <input id="follow-logs" className="form-check-input" type="checkbox" checked={follow} onChange={() => setFollow(!follow)} />
            <span className="form-check-label">{t('APP_LOGS_TAB_FOLLOW')}</span>
          </label>
        </div>
        <div className="col">
          <label className="form-check form-switch mt-1" htmlFor="follow-logs">
            <input id="follow-logs" className="form-check-input" type="checkbox" checked={wrapLines} onChange={() => setWrapLines(!wrapLines)} />
            <span className="form-check-label">{t('APP_LOGS_TAB_WRAP_LINES')}</span>
          </label>
        </div>
        <div className="col">
          <div className="input-group mb-2">
            <span className="input-group-text">{t('APP_LOGS_TAB_MAX_LINES')}</span>
            <input
              id="max-lines"
              type="number"
              className="form-control"
              value={maxLines}
              onChange={(e) => updateMaxLines(Number.parseInt(e.target.value, 10))}
            />
          </div>
        </div>
      </div>
      <pre
        id="log-terminal"
        className={clsx("mt-2", styles.logTerminal, {
          [styles.wrapLines || ""]: wrapLines,
        })}
        ref={ref}
        dangerouslySetInnerHTML={{
          __html: logs.map(({ text }) => text).join("<br>"),
        }}
      />
    </div>
  );
};
