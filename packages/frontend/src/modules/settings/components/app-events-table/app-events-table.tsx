import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { DateFormat } from '@/components/date-format/date-format';
import type { GetAppEventsResponse } from '@/api-client';
import { CancelAppEventDialog } from '../cancel-app-event-dialog/cancel-app-event-dialog';
import { useTranslation } from 'react-i18next';

export const AppEventsTable = ({ events }: GetAppEventsResponse) => {
  const { t } = useTranslation();

  return (
    <div className="d-flex flex-column">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('ID')}</TableHead>
            <TableHead>{t('SETTINGS_EVENTS_QUEUE_NAME')}</TableHead>
            <TableHead>{t('SETTINGS_EVENTS_STARTED_AT')}</TableHead>
            <TableHead>{t('SETTINGS_EVENTS_EXPIRES_AT')}</TableHead>
            <TableHead>{t('SETTINGS_EVENTS_ACTIONS')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((appEvent) => (
            <TableRow key={appEvent.requestId}>
              <TableCell>{appEvent.requestId}</TableCell>
              <TableCell>{appEvent.queueName}</TableCell>
              <TableCell>
                <DateFormat date={new Date(appEvent.timestamp)} />
              </TableCell>
              <TableCell>
                <DateFormat date={new Date(appEvent.timestamp + appEvent.expiration)} />
              </TableCell>
              <TableCell>
                <CancelAppEventDialog id={appEvent.requestId} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
