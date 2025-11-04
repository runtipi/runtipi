import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { DateFormat } from '@/components/date-format/date-format';
import type { GetAppEventsResponse } from '@/api-client';
import { CancelAppEventDialog } from '../cancel-app-event-dialog/cancel-app-event-dialog';

export const AppEventsTable = ({ events }: GetAppEventsResponse) => {
  return (
    <div className="d-flex flex-column">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Queue</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Actions</TableHead>
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
