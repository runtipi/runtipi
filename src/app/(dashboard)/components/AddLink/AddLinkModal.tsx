import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import React from 'react';
import { addLinkAction } from '@/actions/custom-links/add-link-action';
import { editLinkAction } from '@/actions/custom-links/edit-link-action';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useAction } from 'next-safe-action/hooks';
import { LinkInfo } from '@runtipi/shared';
import { useTranslations } from 'next-intl';

type FormValues = { title: string; url: string; iconUrl: string | null };

type AddLinkModalProps = {
  isOpen: boolean;
  onClose: () => void;
  link?: LinkInfo;
};

export const AddLinkModal: React.FC<AddLinkModalProps> = ({ isOpen, onClose, link }) => {
  const t = useTranslations();
  const router = useRouter();

  const schema = z.object({
    title: z.string().min(1).max(20),
    url: z.string().url(),
    iconUrl: z.string().url().or(z.string().max(0)),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: link?.title,
      url: link?.url,
      iconUrl: link?.iconUrl || '',
    },
  });

  const addLinkMutation = useAction(addLinkAction, {
    onError: (e) => {
      if (e.serverError) toast.error(e.serverError);
    },
    onSuccess: () => {
      router.refresh();
      reset();
      onClose();
      toast.success(t('LINKS_ADD_SUCCESS'));
    },
  });

  const editLinkMutation = useAction(editLinkAction, {
    onError: (e) => {
      if (e.serverError) toast.error(e.serverError);
    },
    onSuccess: () => {
      router.refresh();
      reset();
      onClose();
      toast.success(t('LINKS_EDIT_SUCCESS'));
    },
  });

  const mutationExecuting = addLinkMutation.status === 'executing' || editLinkMutation.status === 'executing';

  const onSubmit = (data: FormValues) => {
    const { title, url, iconUrl } = data;
    if (link) {
      editLinkMutation.execute({ id: link?.id, title, url, iconUrl });
    } else {
      addLinkMutation.execute({ title, url, iconUrl });
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
              label={t('LINKS_FORM_LINK_TITLE')}
              placeholder="Runtipi demo"
              error={errors.title?.message}
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
            <Button type="submit" className="btn-success" disabled={mutationExecuting}>
              {link ? t('LINKS_EDIT_SUBMIT') : t('LINKS_ADD_SUBTITLE')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
