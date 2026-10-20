import {
  backupAppMutation,
  deleteAppBackupMutation,
  getAppBackupsOptions,
  restoreAppBackupMutation,
  uploadBackupMutation,
} from '@/api-client/@tanstack/react-query.gen';
import { FileSize } from '@/components/file-size/file-size';
import { useAppContext } from '@/context/app-context';
import { useDisclosure } from '@/lib/hooks/use-disclosure';
import type { AppBackup, AppInfo, AppStatus } from '@/types/app.types';
import type { TranslatableError } from '@/types/error.types';
import { IconArchive, IconDownload, IconRestore, IconTrash, IconUpload } from '@tabler/icons-react';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import React from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { BackupAppDialog } from '../../components/dialogs/backup-app-dialog/backup-app-dialog';
import { DeleteAppBackupDialog } from '../../components/dialogs/delete-backup-dialog/delete-backup-dialog';
import { RestoreAppDialog } from '../../components/dialogs/restore-app-dialog/restore-app-dialog';
import { UploadBackupDialog } from '../../components/dialogs/upload-backup-dialog/upload-backup-dialog';
import { formatShortDate } from '../../components/app-details-view/app-format';
import './app-backups.css';

/** Page numbers to show, `null` standing for a gap: 1 … 4 5 6 … 12 */
const getPageItems = (page: number, total: number): (number | null)[] => {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const start = Math.max(2, Math.min(page - 1, total - 4));
  const end = Math.min(total - 1, Math.max(page + 1, 5));
  const range = (from: number, to: number) => Array.from({ length: Math.max(0, to - from + 1) }, (_, index) => from + index);
  // A gap only replaces two pages or more
  const head = start > 3 ? [null] : range(2, start - 1);
  const tail = end < total - 2 ? [null] : range(end + 1, total - 1);

  return [1, ...head, ...range(start, end), ...tail, total];
};

type Props = {
  info: AppInfo;
  status: AppStatus;
};

export const AppBackups = ({ info, status }: Props) => {
  const { t } = useTranslation();
  const { userSettings } = useAppContext();
  const { timeZone } = userSettings;
  const [page, setPage] = React.useState(1);
  const [selectedBackup, setSelectedBackup] = React.useState<AppBackup | null>(null);

  const backupModalDisclosure = useDisclosure();
  const restoreModalDisclosure = useDisclosure();
  const deleteBackupModalDisclosure = useDisclosure();
  const uploadModalDisclosure = useDisclosure();

  const { data } = useSuspenseQuery({
    ...getAppBackupsOptions({ path: { urn: info.urn }, query: { page, pageSize: 5 } }),
  });

  const backupApp = useMutation({
    ...backupAppMutation(),
    onMutate: () => {
      backupModalDisclosure.close();
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  const restoreAppBackup = useMutation({
    ...restoreAppBackupMutation(),
    onMutate: () => {
      restoreModalDisclosure.close();
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  const deleteAppBackup = useMutation({
    ...deleteAppBackupMutation(),
    onMutate: () => {
      deleteBackupModalDisclosure.close();
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  const uploadBackup = useMutation({
    ...uploadBackupMutation(),
    onMutate: () => {
      uploadModalDisclosure.close();
    },
    onSuccess: () => {
      toast.success(t('APP_BACKUP_UPLOAD_SUCCESS'));
    },
    onError: () => {
      toast.error(t('APP_BACKUP_UPLOAD_ERROR'));
    },
  });

  const handleUploadConfirm = (file: File) => {
    uploadBackup.mutate({ body: { file }, path: { urn: info.urn } });
  };

  const handleRestoreClick = (backup: AppBackup) => {
    setSelectedBackup(backup);
    restoreModalDisclosure.open();
  };

  const handleDeleteClick = (backup: AppBackup) => {
    setSelectedBackup(backup);
    deleteBackupModalDisclosure.open();
  };

  const handleDownloadClick = (backup: AppBackup) => {
    window.open(`/api/backups/${info.urn}/${backup.id}/download`);
  };

  const disableActions =
    status === 'missing' ||
    status === 'updating' ||
    status === 'backing_up' ||
    status === 'restoring' ||
    backupApp.isPending ||
    restoreAppBackup.isPending ||
    deleteAppBackup.isPending ||
    uploadBackup.isPending;

  const totalPages = Math.max(1, data.lastPage);

  return (
    <section className="rt-panel rt-backups" aria-labelledby="rt-backups-title">
      <div className="rt-backups__head">
        <div>
          <h2 id="rt-backups-title" className="rt-appd-h2">
            {t('APP_BACKUPS_TAB_TITLE')}
          </h2>
          <p className="rt-backups__sub">{t('APP_PAGE_BACKUPS_SUBTITLE')}</p>
        </div>
        <div className="rt-backups__actions">
          <button type="button" className="rt-btn" onClick={uploadModalDisclosure.open} disabled={disableActions}>
            <IconUpload size={15} stroke={1.8} />
            {t('APP_PAGE_UPLOAD')}
          </button>
          <button type="button" className="rt-btn rt-btn--primary" onClick={backupModalDisclosure.open} disabled={disableActions}>
            {t('BACKUPS_LIST_BACKUP_NOW')}
          </button>
        </div>
      </div>
      {data.data.length === 0 ? (
        <p className="rt-backups__empty">{t('APP_PAGE_BACKUPS_EMPTY')}</p>
      ) : (
        <ul className="rt-backups__list">
          {data.data.map((backup) => (
            <li key={backup.id} className="rt-backups__row">
              <span className="rt-backups__icon" aria-hidden="true">
                <IconArchive size={17} stroke={1.8} />
              </span>
              <div className="rt-backups__meta">
                <div className="rt-backups__date">{formatShortDate(backup.date, timeZone)}</div>
                <div className="rt-backups__id rt-mono">{backup.id}</div>
              </div>
              <span className="rt-backups__size rt-mono">
                <FileSize size={backup.size} />
              </span>
              <div className="rt-backups__row-actions">
                <button
                  type="button"
                  className="rt-icon-btn"
                  onClick={() => handleDownloadClick(backup)}
                  disabled={disableActions}
                  aria-label={t('APP_BACKUP_DOWNLOAD')}
                  title={t('APP_BACKUP_DOWNLOAD')}
                >
                  <IconDownload size={15} stroke={1.8} />
                </button>
                <button
                  type="button"
                  className="rt-icon-btn"
                  onClick={() => handleRestoreClick(backup)}
                  disabled={disableActions}
                  aria-label={t('APP_RESTORE_SUBMIT')}
                  title={t('APP_RESTORE_SUBMIT')}
                >
                  <IconRestore size={15} stroke={1.8} />
                </button>
                <button
                  type="button"
                  className="rt-icon-btn rt-icon-btn--danger"
                  onClick={() => handleDeleteClick(backup)}
                  disabled={disableActions}
                  aria-label={t('DELETE_BACKUP_MODAL_SUBMIT')}
                  title={t('DELETE_BACKUP_MODAL_SUBMIT')}
                >
                  <IconTrash size={15} stroke={1.8} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {totalPages > 1 && (
        <nav className="rt-backups__pages" aria-label={t('APP_PAGE_BACKUP_PAGES')}>
          <button type="button" className="rt-pg" aria-label={t('APP_PAGE_PREVIOUS_PAGE')} disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ‹
          </button>
          {getPageItems(page, totalPages).map((p, index) =>
            p === null ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: gaps have no identity of their own
              <span key={`gap-${index}`} className="rt-pg rt-pg--gap" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                className={clsx('rt-pg', { 'is-on': p === page })}
                aria-current={p === page ? 'page' : undefined}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ),
          )}
          <button
            type="button"
            className="rt-pg"
            aria-label={t('APP_PAGE_NEXT_PAGE')}
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            ›
          </button>
        </nav>
      )}
      <BackupAppDialog
        info={info}
        isOpen={backupModalDisclosure.isOpen}
        onClose={backupModalDisclosure.close}
        onConfirm={() => backupApp.mutate({ path: { urn: info.urn } })}
      />
      <RestoreAppDialog
        appName={info.name}
        backup={selectedBackup}
        isOpen={restoreModalDisclosure.isOpen}
        onClose={restoreModalDisclosure.close}
        onConfirm={() => selectedBackup && restoreAppBackup.mutate({ path: { urn: info.urn }, body: { filename: selectedBackup.id } })}
      />
      <DeleteAppBackupDialog
        backup={selectedBackup}
        isOpen={deleteBackupModalDisclosure.isOpen}
        onClose={deleteBackupModalDisclosure.close}
        onConfirm={() => selectedBackup && deleteAppBackup.mutate({ path: { urn: info.urn }, body: { filename: selectedBackup.id } })}
      />
      <UploadBackupDialog isOpen={uploadModalDisclosure.isOpen} onClose={uploadModalDisclosure.close} onConfirm={handleUploadConfirm} />
    </section>
  );
};
