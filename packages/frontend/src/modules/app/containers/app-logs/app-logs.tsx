import { useSSE } from '@/lib/hooks/use-sse';
import { Suspense, lazy, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const LogsTerminal = lazy(() => import('@/components/logs-terminal/logs-terminal').then((module) => ({ default: module.LogsTerminal })));

type Props = {
  appUrn: string;
  isRunning: boolean;
};

export const AppLogs = ({ appUrn, isRunning }: Props) => {
  const { t } = useTranslation();

  if (!isRunning) {
    return (
      <section className="rt-panel rt-logs-panel" aria-labelledby="rt-app-logs-title">
        <h2 id="rt-app-logs-title" className="rt-logs__title">
          {t('APP_LOGS_TAB_TITLE')}
        </h2>
        <p className="rt-logs__empty">{t('APP_PAGE_LOGS_NOT_RUNNING')}</p>
      </section>
    );
  }

  return <AppLogsStream appUrn={appUrn} />;
};

const AppLogsStream = ({ appUrn }: { appUrn: string }) => {
  const { t } = useTranslation();
  let nextId = 0;
  const [logs, setLogs] = useState<{ id: number; text: string }[]>([]);
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

  const updateMaxLines = (lines: number) => {
    const linesToKeep = Math.max(1, lines);
    maxLines.current = linesToKeep;
    setLogs((currentLogs) => currentLogs.slice(currentLogs.length - linesToKeep));
  };

  return (
    <section className="rt-panel rt-logs-panel">
      <Suspense>
        <LogsTerminal
          logs={logs}
          maxLines={maxLines.current}
          onMaxLinesChange={updateMaxLines}
          title={<h2 className="rt-logs__title">{t('APP_LOGS_TAB_TITLE')}</h2>}
          downloadName={appUrn.replace(':', '-')}
        />
      </Suspense>
    </section>
  );
};
