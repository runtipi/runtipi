'use client';

import React, { useState } from 'react';
import { useSocket } from '@/lib/socket/useSocket';
import { LogsTerminal } from 'src/app/components/LogsTerminal/LogsTerminal';

export const LogsContainer = () => {
  let nextId = 0;
  const [logs, setLogs] = useState<{ id: number; text: string }[]>([]);
  const [maxLines, setMaxLines] = useState<number>(300);

  useSocket({
    selector: { type: 'runtipi-logs', event: 'newLogs' },
    onCleanup: () => setLogs([]),
    emitOnConnect: { type: 'runtipi-logs-init', event: 'initLogs', data: { maxLines } },
    emitOnDisconnect: { type: 'runtipi-logs', event: 'stopLogs', data: {} },
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
