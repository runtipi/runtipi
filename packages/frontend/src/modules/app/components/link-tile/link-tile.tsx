import { AppLogo } from '@/components/app-logo/app-logo';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/ContextMenu/ContextMenu';
import { useDisclosure } from '@/lib/hooks/use-disclosure';
import type { CustomLink } from '@/types/app.types';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import type React from 'react';
import { useTranslation } from 'react-i18next';
import { AddLinkDialog } from '../dialogs/add-link/add-link-dialog';
import { DeleteLinkDialog } from '../dialogs/delete-link/delete-link-dialog';

type LinkTileProps = {
  link: CustomLink;
};

export const LinkTile: React.FC<LinkTileProps> = ({ link }) => {
  const { t } = useTranslation();

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
          <div data-testid={`link-tile-${link.title}`}>
            <div className="card card-sm card-link">
              <div className="card-body">
                <div className="d-flex align-items-center overflow-hidden">
                  <span className="me-3">
                    <AppLogo url={link.iconUrl || ''} size={60} />
                  </span>
                  <div>
                    <div className="d-flex h-3 align-items-center">
                      <span className="h4 me-2 mb-1 fw-bolder">{link.title}</span>
                    </div>
                    {link.description?.length !== 0 && <div className="text-muted text-break">{link.description}</div>}
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
      <AddLinkDialog isOpen={addLinkDisclosure.isOpen} onClose={addLinkDisclosure.close} link={link} />
      <DeleteLinkDialog isOpen={deleteLinkDisclosure.isOpen} onClose={deleteLinkDisclosure.close} linkTitle={link.title} linkId={link.id} />
    </>
  );
};
