import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import React from "react";
import { addLinkAction, editLinkAction } from "@/actions/custom-links/add-link-action";
import toast from "react-hot-toast";
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useAction } from 'next-safe-action/hook';
import { LinkInfo } from '@runtipi/shared';
import { useTranslations } from 'next-intl';

type FormValues = { title: string; url: string, iconUrl: string | null };

type AddLinkModalProps = {
  isOpen: boolean;
  onClose: () => void;
  link?: LinkInfo
}

export const AddLinkModal: React.FC<AddLinkModalProps> = ({ isOpen, onClose, link }) => {
  const t = useTranslations('apps.my-apps.links');
  const router = useRouter();

  const schema = z
    .object({
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
      iconUrl: link?.iconUrl || "",
    }
  });

  const addLinkMutation = useAction(addLinkAction, {
    onError: (e) => {
      if (e.serverError) toast.error(e.serverError);
    },
    onSuccess: () => {
      router.refresh();
      reset();
      onClose();
      toast.success(t('add.success'));
    }  
  });

  const editLinkMutation = useAction(editLinkAction, {
    onError: (e) => {
      if (e.serverError) toast.error(e.serverError);
    },
    onSuccess: () => {
      router.refresh();
      reset();
      onClose();
      toast.success(t('edit.success'));
    }  
  })

  const mutationStatus = addLinkMutation.status === 'executing' || editLinkMutation.status === 'executing' ? 'executing' : null

  const onSubmit = (data: FormValues) => {
    const { title, url, iconUrl } = data;
    if (link) {
      editLinkMutation.execute({ id: link?.id, title, url, iconUrl});
    } else {
      addLinkMutation.execute({ title, url, iconUrl});
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={mutationStatus() === 'executing' ? undefined : onClose}>
      <DialogContent size="sm">
        <form onSubmit={handleSubmit((values) => onSubmit(values))}>
          <DialogHeader>
            <h5 className="modal-title">{link ? t('edit.title') : t('add.title')}</h5>
          </DialogHeader>
          <DialogDescription>

            <Input
              disabled={mutationStatus() === 'executing'}
              {...register('title')}
              label={t('form.title')}
              placeholder='Runtipi demo'
              error={errors.title?.message} />

            <Input
              disabled={mutationStatus() === 'executing'}
              {...register('url')}
              className='mt-3'
              label={t('form.link-url')}
              placeholder='https://demo.runtipi.io'
              error={errors.url?.message} />

            <Input
            disabled={mutationStatus() === 'executing'}
              {...register('iconUrl')}
              className='mt-3'
              label={t('form.icon-url')}
              placeholder={t('form.icon-placeholder')}
              error={errors.iconUrl?.message} />

          </DialogDescription>
          <DialogFooter>
            <Button type='submit' className="btn-success" disabled={mutationStatus() === 'executing'}>
              {link ? t('edit.submit') : t('add.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}