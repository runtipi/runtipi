import { addLinkAction } from '@/actions/custom-links/add-link-action';
import { editLinkAction } from '@/actions/custom-links/edit-link-action';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { zodResolver } from '@hookform/resolvers/zod';
import type { LinkInfo } from '@runtipi/shared';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';

type FormValues = { title: string; url: string; description: string | null; iconUrl: string | null };

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
    description: z.string().min(0).max(50).nullable(),
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
    defaultValues: link,
  });

  useEffect(() => {
    reset(link);
  }, [link, reset]);

  const addLinkMutation = useAction(addLinkAction, {
    onError: ({ error }) => {
      if (error.serverError) toast.error(error.serverError);
    },
    onSuccess: () => {
      router.refresh();
      reset();
      onClose();
      toast.success(t('LINKS_ADD_SUCCESS'));
    },
  });

  const editLinkMutation = useAction(editLinkAction, {
    onError: ({ error }) => {
      if (error.serverError) toast.error(error.serverError);
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
    const { title, url, description, iconUrl } = data;
    if (link) {
      editLinkMutation.execute({ id: link?.id, title, description, url, iconUrl });
    } else {
      addLinkMutation.execute({ title, description, url, iconUrl });
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
