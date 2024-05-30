'use client';

import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import styles from './LogsTerminal.module.scss';
import { useTranslations } from 'next-intl';

type Props = {
  logs: { id: number; text: string }[];
  maxLines: number;
  onMaxLinesChange: (lines: number) => void;
};

export const LogsTerminal = (props: Props) => {
  const t = useTranslations();

  const { logs, onMaxLinesChange, maxLines } = props;
  const [follow, setFollow] = useState<boolean>(true);
  const [wrapLines, setWrapLines] = useState<boolean>(false);
  const ref = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (ref.current && follow) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [logs, follow]);

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
              onChange={(e) => updateMaxLines(parseInt(e.target.value, 10))}
            />
          </div>
        </div>
      </div>
      <pre id="log-terminal" className={clsx('mt-2', styles.logTerminal, { [styles.wrapLines || '']: wrapLines })} ref={ref}>
        {logs.map((log) => (
          <React.Fragment key={log.id}>
            {log.text}
            <br />
          </React.Fragment>
        ))}
      </pre>
    </div>
  );
};
