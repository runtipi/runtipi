import { AppIcon } from '@/components/app-icon/app-icon';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import type { CustomLink } from '@/types/app.types';
import { IconArrowUpRight, IconDotsVertical, IconEdit, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AddLinkDialog } from '../dialogs/add-link/add-link-dialog';
import { DeleteLinkDialog } from '../dialogs/delete-link/delete-link-dialog';
import '../app-card/app-card.css';

export const LinkCard = ({ link }: { link: CustomLink }) => {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<'edit' | 'delete' | null>(null);

  return (
    <article className="rt-app-card" data-testid={`link-tile-${link.title}`}>
      <div className="rt-app-card__top">
        <AppIcon name={link.title} src={link.iconUrl || undefined} categories={['network']} />
        <div className="rt-app-card__text">
          <h3>
            <a href={link.url} target="_blank" rel="noreferrer" className="rt-app-card__name">
              {link.title}
            </a>
          </h3>
          <p className="rt-app-card__desc">{link.description || link.url}</p>
        </div>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button type="button" className="rt-kebab rt-app-card__kebab" aria-label={t('MY_APPS_MORE_ACTIONS', { name: link.title })}>
              <IconDotsVertical size={17} stroke={1.8} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setDialog('edit')}>
              <IconEdit className="me-2" size={16} />
              {t('LINKS_EDIT_CONTEXT_MENU')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDialog('delete')} className="text-danger">
              <IconTrash className="me-2" size={16} />
              {t('LINKS_DELETE_CONTEXT_MENU')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rt-app-card__actions">
        <a href={link.url} target="_blank" rel="noreferrer" className="rt-ctl rt-ctl--open" aria-label={t('MY_APPS_OPEN_APP', { name: link.title })}>
          <IconArrowUpRight size={16} stroke={2} />
        </a>
      </div>
      <AddLinkDialog isOpen={dialog === 'edit'} onClose={() => setDialog(null)} link={link} />
      <DeleteLinkDialog isOpen={dialog === 'delete'} onClose={() => setDialog(null)} linkTitle={link.title} linkId={link.id} />
    </article>
  );
};
