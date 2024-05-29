'use client';

import React, { useState } from 'react';
import { useSocket } from '@/lib/socket/useSocket';
import { LogsTerminal } from 'src/app/components/LogsTerminal/LogsTerminal';

export const AppLogs = ({ appId }: { appId: string }) => {
  let nextId = 0;
  const [logs, setLogs] = useState<{ id: number; text: string }[]>([]);
  const [maxLines, setMaxLines] = useState<number>(300);

  useSocket({
    selector: { type: 'logs', event: 'newLogs', data: { property: 'appId', value: appId } },
    onCleanup: () => setLogs([]),
    emitOnConnect: { event: 'viewLogs', data: { appId } },
    emitOnDisconnect: { event: 'stopLogs', data: { appId } },
    onEvent: (_, data) => {
      setLogs((prevLogs) => {
        if (!data.lines) {
          return prevLogs;
        }
        const newLogs = [...prevLogs, ...data.lines.map((line) => ({ id: nextId++, text: line.trim() }))];
        if (newLogs.length > maxLines) {
          return newLogs.slice(newLogs.length - maxLines);
        }
        return newLogs;
      });
    },
  });

  const updateMaxLines = (lines: number) => {
    const linesToKeep = Math.max(1, lines);
    setMaxLines(linesToKeep);
    setLogs(logs.slice(logs.length - linesToKeep));
  };

  return <LogsTerminal logs={logs} maxLines={maxLines} onMaxLinesChange={updateMaxLines} />;
};
