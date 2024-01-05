'use client';

import React from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { IconTrash, IconEdit } from '@tabler/icons-react';
import { useDisclosure } from '@/client/hooks/useDisclosure';
import { AddLinkModal } from 'src/app/(dashboard)/components/AddLink/AddLinkModal';
import { DeleteLinkModal } from 'src/app/(dashboard)/components/AddLink/DeleteLinkModa';
import { LinkInfo } from '@runtipi/shared';
import { Link } from '@/server/db/schema';
import { AppLogo } from '../AppLogo';
import './LinkTile.css';

type LinkTileProps = {
  link: Link;
};

export const LinkTile: React.FC<LinkTileProps> = ({link: { id, title, url, iconURL }}) => {

  const link: LinkInfo  = { id, title, url, iconURL };
  const addLinkDisclosure = useDisclosure();
  const deleteLinkDisclosure = useDisclosure();

  const handleEdit = () => {
    addLinkDisclosure.open();
  }

  const handleDelete = () => {
    deleteLinkDisclosure.open();
  }

  return (
    <>
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <div data-testid={`link-tile-${title}`}>
            <div className="card card-sm card-link">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <span className="me-3">
                    <AppLogo url={iconURL || ''} size={60} />
                  </span>
                  <div>
                    <div className="d-flex h-3 align-items-center">
                      <span className="h4 me-2 mb-1 fw-bolder">{title}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ContextMenu.Trigger>

        <ContextMenu.Portal>

          <ContextMenu.Content className='ContextMenuContent'>
            <ContextMenu.Item className='ContextMenuItem' onClick={handleEdit}>
              <IconEdit size={15} /> Edit
            </ContextMenu.Item>

            <ContextMenu.Item className='ContextMenuItem' onClick={handleDelete}>
              <IconTrash size={15} /> Remove
            </ContextMenu.Item>
          </ContextMenu.Content>

        </ContextMenu.Portal>
      </ContextMenu.Root>

      <AddLinkModal 
        isOpen={addLinkDisclosure.isOpen} 
        onClose={addLinkDisclosure.close}
        link={link} />

      <DeleteLinkModal 
        isOpen={deleteLinkDisclosure.isOpen} 
        onClose={deleteLinkDisclosure.close} 
        linkTitle={title}
        linkId={id} />
    </>
  );
};
