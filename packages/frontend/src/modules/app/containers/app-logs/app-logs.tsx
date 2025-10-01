import { useSSE } from '@/lib/hooks/use-sse';
import { Button } from '@/components/ui/Button';
import { Suspense, lazy, useRef, useState } from 'react';
import { ClearLogsDialog } from '../../components/dialogs/clear-logs-dialog/clear-logs-dialog';
import type { AppInfo } from '@/types/app.types';

const LogsTerminal = lazy(() => import('@/components/logs-terminal/logs-terminal').then((module) => ({ default: module.LogsTerminal })));

export const AppLogs = ({ appUrn, info }: { appUrn: string; info: AppInfo }) => {
  let nextId = 0;
  const [logs, setLogs] = useState<{ id: number; text: string }[]>([]);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const maxLines = useRef(300);

  useSSE({
    topic: 'app-logs',
    params: new URLSearchParams({ appUrn, maxLines: maxLines.current.toString() }),
    onEvent: (data) => {
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

  const handleClearLogs = () => {
    setLogs([]);
    setShowClearDialog(false);
  };

  const updateMaxLines = (lines: number) => {
    const linesToKeep = Math.max(1, lines);
    maxLines.current = linesToKeep;
    setLogs((currentLogs) => currentLogs.slice(currentLogs.length - linesToKeep));
  };

  return (
    <>
      <div className="mb-3 d-flex justify-content-end">
        <Button onClick={() => setShowClearDialog(true)} intent="danger" size="sm">
          Clear Logs
        </Button>
      </div>
      <Suspense>
        <LogsTerminal logs={logs} maxLines={maxLines.current} onMaxLinesChange={updateMaxLines} />
      </Suspense>
      <ClearLogsDialog
        info={info}
        isOpen={showClearDialog}
        onClose={() => setShowClearDialog(false)}
      />
    </>
  );
};
