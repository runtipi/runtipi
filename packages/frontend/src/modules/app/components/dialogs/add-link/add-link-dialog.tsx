import { createLinkMutation, editLinkMutation } from '@/api-client/@tanstack/react-query.gen';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import type { CustomLink } from '@/types/app.types';
import type { TranslatableError } from '@/types/error.types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import type React from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

type FormValues = { title: string; url: string; description?: string; iconUrl?: string };

type AddLinkDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  link?: CustomLink;
};

export const AddLinkDialog: React.FC<AddLinkDialogProps> = ({ isOpen, onClose, link }) => {
  const { t } = useTranslation();

  const schema = z.object({
    title: z.string().min(1).max(20),
    description: z.string().min(0).max(50).nullable(),
    url: z.string().url(),
    iconUrl: z.string().url().or(z.string().max(0)),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...link,
      description: link?.description || '',
      iconUrl: link?.iconUrl || '',
    },
  });

  const addLink = useMutation({
    ...createLinkMutation(),
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
    onSuccess: () => {
      onClose();
      toast.success(t('LINKS_ADD_SUCCESS'));
    },
  });

  const editLink = useMutation({
    ...editLinkMutation(),
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
    onSuccess: () => {
      onClose();
      toast.success(t('LINKS_EDIT_SUCCESS'));
    },
  });

  const mutationExecuting = addLink.isPending || editLink.isPending;

  const onSubmit = (data: FormValues) => {
    const { title, url, description, iconUrl } = data;
    if (link) {
      editLink.mutate({ body: { title, description, url, iconUrl }, path: { id: link.id } });
    } else {
      addLink.mutate({ body: { title, description, url, iconUrl } });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={mutationExecuting ? undefined : onClose}>
      <DialogContent size="sm">
        <form onSubmit={handleSubmit((values) => onSubmit(values))}>
          <DialogHeader>
            <h5 className="modal-title">{link ? t('LINKS_EDIT_TITLE') : t('LINKS_ADD_TITLE')}</h5>
          </DialogHeader>
          <DialogDescription>
            <Input
              disabled={mutationExecuting}
              {...register('title')}
              maxLength={20}
              label={t('LINKS_FORM_LINK_TITLE')}
              placeholder="Runtipi demo"
              error={errors.title?.message}
            />
            <Input
              disabled={mutationExecuting}
              type="text"
              {...register('description')}
              maxLength={50}
              className="mt-3"
              label={t('LINKS_FROM_LINK_DESCRIPTION')}
              placeholder="My super app"
              error={errors.description?.message}
            />
            <Input
              disabled={mutationExecuting}
              {...register('url')}
              className="mt-3"
              label={t('LINKS_FORM_LINK_URL')}
              placeholder="https://demo.runtipi.io"
              error={errors.url?.message}
            />

            <Input
              disabled={mutationExecuting}
              {...register('iconUrl')}
              className="mt-3"
              label={t('LINKS_FORM_ICON_URL')}
              placeholder={t('LINKS_FORM_ICON_PLACEHOLDER')}
              error={errors.iconUrl?.message}
            />
          </DialogDescription>
          <DialogFooter>
            <Button type="submit" intent="success" disabled={mutationExecuting}>
              {link ? t('LINKS_EDIT_SUBMIT') : t('LINKS_ADD_SUBMIT')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
