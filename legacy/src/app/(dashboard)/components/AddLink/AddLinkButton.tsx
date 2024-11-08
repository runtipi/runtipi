'use client';

import { useDisclosure } from '@/client/hooks/useDisclosure';
import { IconNewSection } from '@tabler/icons-react';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import { AddLinkModal } from './AddLinkModal';
import styles from './addLink.module.css';

export const AddLinkButton = () => {
  const t = useTranslations();
  const addLinkDisclosure = useDisclosure();

  return (
    <>
      <button type="button" className={clsx('col-sm-6 col-lg-4', styles.addLinkButton)} onClick={() => addLinkDisclosure.open()}>
        <div className="card card-sm card-link">
          <div className="card-body">
            <div className="d-flex align-items-center">
              <span className="me-3">
                <IconNewSection size={60} stroke={1.25} color="#A4A4A4" />
              </span>
              <div>
                <div className="d-flex h-3 align-items-center">
                  <span className="h4 me-2 mb-1 fw-bolder">{t('LINKS_ADD_TITLE')}</span>
                </div>
                <div className="text-muted text-start">{t('LINKS_ADD_SUBTITLE')}</div>
              </div>
            </div>
          </div>
        </div>
      </button>
      <AddLinkModal isOpen={addLinkDisclosure.isOpen} onClose={() => addLinkDisclosure.close()} />
    </>
  );
};
