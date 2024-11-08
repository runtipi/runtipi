'use client';

import { ClientOnly } from '@/components/ClientOnly/ClientOnly';
import { useSocket } from '@/lib/socket/useSocket';
import { useState, useRef } from 'react';
import { LogsTerminal } from 'src/app/components/LogsTerminal/LogsTerminal';

export const AppLogs = ({ appId }: { appId: string }) => {
  let nextId = 0;
  const [logs, setLogs] = useState<{ id: number; text: string }[]>([]);
  const maxLines = useRef(300);

  useSocket({
    selector: { type: 'app-logs', event: 'newLogs', data: { property: 'appId', value: appId } },
    onCleanup: () => setLogs([]),
    emitOnConnect: { type: 'app-logs-init', event: 'initLogs', data: { appId, maxLines: maxLines.current } },
    emitOnDisconnect: { type: 'app-logs', event: 'stopLogs', data: { appId } },
    onEvent: (_, data) => {
      setLogs((prevLogs) => {
        if (!data.lines) {
          return prevLogs;
        }
        const newLogs = [...prevLogs, ...data.lines.map((line) => ({ id: nextId++, text: line.trim() }))];
        if (newLogs.length > maxLines.current) {
          return newLogs.slice(newLogs.length - maxLines.current);
        }
        return newLogs;
      });
    },
  });

  const updateMaxLines = (lines: number) => {
    const linesToKeep = Math.max(1, lines);
    maxLines.current = linesToKeep;
    setLogs((currentLogs) => currentLogs.slice(currentLogs.length - linesToKeep));
  };

  return (
    <ClientOnly>
      <LogsTerminal logs={logs} maxLines={maxLines.current} onMaxLinesChange={updateMaxLines} />
    </ClientOnly>
  );
};
