'use client'

import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '@/lib/socket/useSocket';
import { useSocketEmit } from '@/lib/socket/useSocketEmit';
import clsx from 'clsx';
import styles from './LogsTerminal.module.scss';

export const LogsTerminal = ({ appId }: { appId: string }) => {
  let nextId = 0;
  const [logs, setLogs] = useState<{ id: number, text: string }[]>([]);
  const [follow, setFollow] = useState<boolean>(true);
  const ref = useRef<HTMLPreElement>(null);

  useSocketEmit({ type: 'viewLogs', data: { appId }});


  useEffect(() => {
    if (ref.current && follow) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [logs, follow]);

  const handleChangeFollow = () => {
    setFollow(!follow);
  }

  useSocket({
    selector: { type: 'logs' },
    onEvent: (event, lines) => {
      lines.forEach((line) => {
        setLogs(prevLogs => [
          ...prevLogs,
          // eslint-disable-next-line no-plusplus
          { id: nextId++, text: line.trim() }
        ])
      });
    },
  });

  return (
    <div>
        <label className="form-check form-switch mt-1" htmlFor="follow-logs">
          <input
            id="follow-logs"
            className="form-check-input"
            type="checkbox"
            checked={follow}
            onChange={handleChangeFollow} />
          <span className="form-check-label">Follow logs</span>
        </label>
        <pre id='log-terminal' className={clsx('mt-2', styles.logTerminal)} ref={ref} >
          {logs.map((log) => (
            <React.Fragment key={log.id}>{log.text}<br /></React.Fragment>
          ))}
        </pre>
    </div>
  );
}