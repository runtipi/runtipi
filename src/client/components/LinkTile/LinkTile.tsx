'use client';

import type React from 'react';
import { IconTrash, IconEdit } from '@tabler/icons-react';
import { useDisclosure } from '@/client/hooks/useDisclosure';
import { ContextMenu, ContextMenuItem, ContextMenuContent, ContextMenuTrigger } from '@/client/components/ui/ContextMenu/ContextMenu';
import { AddLinkModal } from 'src/app/(dashboard)/components/AddLink/AddLinkModal';
import { DeleteLinkModal } from 'src/app/(dashboard)/components/AddLink/DeleteLinkModal';
import type { LinkInfo } from '@runtipi/shared';
import type { Link } from '@runtipi/db';
import { useTranslations } from 'next-intl';
import { AppLogo } from '../AppLogo';

type LinkTileProps = {
  link: Link;
};

export const LinkTile: React.FC<LinkTileProps> = ({ link: { id, title, description, url, iconUrl } }) => {
  const t = useTranslations();

  const link: LinkInfo = { id, title, description, url, iconUrl };
  const addLinkDisclosure = useDisclosure();
  const deleteLinkDisclosure = useDisclosure();

  const handleEdit = () => {
    addLinkDisclosure.open();
  };

  const handleDelete = () => {
    deleteLinkDisclosure.open();
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>
          <div data-testid={`link-tile-${title}`}>
            <div className="card card-sm card-link">
              <div className="card-body">
                <div className="d-flex align-items-center overflow-hidden">
                  <span className="me-3">
                    <AppLogo url={iconUrl || ''} size={60} />
                  </span>
                  <div>
                    <div className="d-flex h-3 align-items-center">
                      <span className="h4 me-2 mb-1 fw-bolder">{title}</span>
                    </div>
                    {description?.length !== 0 && <div className="text-muted text-break">{description}</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={handleEdit}>
            <IconEdit size={15} className="me-1" />
            {t('LINKS_EDIT_CONTEXT_MENU')}
          </ContextMenuItem>
          <ContextMenuItem onClick={handleDelete}>
            <IconTrash size={15} className="me-1" />
            {t('LINKS_DELETE_CONTEXT_MENU')}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <AddLinkModal isOpen={addLinkDisclosure.isOpen} onClose={addLinkDisclosure.close} link={link} />
      <DeleteLinkModal isOpen={deleteLinkDisclosure.isOpen} onClose={deleteLinkDisclosure.close} linkTitle={title} linkId={id} />
    </>
  );
};
