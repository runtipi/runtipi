import { useSocket } from '@/lib/hooks/use-socket';
import { Suspense, lazy, useRef, useState } from 'react';

const LogsTerminal = lazy(() => import('@/components/logs-terminal/logs-terminal').then((module) => ({ default: module.LogsTerminal })));

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
    <Suspense>
      <LogsTerminal logs={logs} maxLines={maxLines.current} onMaxLinesChange={updateMaxLines} />
    </Suspense>
  );
};
