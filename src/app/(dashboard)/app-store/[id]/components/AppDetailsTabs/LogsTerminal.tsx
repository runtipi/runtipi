'use client'

import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '@/lib/socket/useSocket';
import { emitViewLogs, stopLogs } from '@/lib/socket/app-logs';

export const LogsTerminal = () => {
  let nextId = 0;
  const [logs, setLogs] = useState<{ id: number, text: string }[]>([]);
  const messageEl: React.RefObject<HTMLElement> = useRef(null);

  useEffect(() => {
    if (messageEl) {
      messageEl.current?.addEventListener('DOMNodeInserted', (event) => {
        const { currentTarget } = event;
        const targetElement = currentTarget as HTMLElement;
        targetElement?.scroll({ top: targetElement.scrollHeight, behavior: 'auto' });
      });
    }

    emitViewLogs();
    return () => {
      stopLogs();
    }
  }, []);

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
      <h1>Logs</h1>
      <div style={{ overflow: "overlay", maxHeight: "300px" }} ref={messageEl}>
        <pre>
          <code>
            {logs.map((log) => (
              <React.Fragment key={log.id}>{log.text}<br /></React.Fragment>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}