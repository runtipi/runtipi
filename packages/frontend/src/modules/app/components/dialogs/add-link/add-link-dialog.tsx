import { createLinkMutation, editLinkMutation } from '@/api-client/@tanstack/react-query.gen';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { useAppContext } from '@/context/app-context';
import type { CustomLink } from '@/types/app.types';
import type { TranslatableError } from '@/types/error.types';
import { arktypeResolver } from '@hookform/resolvers/arktype';
import { useMutation } from '@tanstack/react-query';
import { type } from 'arktype';
import type React from 'react';
import { useId } from 'react';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

type FormValues = {
  title: string;
  url: string;
  description: string;
  iconUrl: string;
  isVisibleOnGuestDashboard: boolean;
};

type AddLinkDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  link?: CustomLink;
};

export const AddLinkDialog: React.FC<AddLinkDialogProps> = ({ isOpen, onClose, link }) => {
  const { t } = useTranslation();
  const { userSettings } = useAppContext();
  const { guestDashboard } = userSettings;

  const schema = type({
    title: 'string > 0 & string <= 20',
    description: 'string <= 50',
    url: 'string.url',
    iconUrl: type('string.url').or(type.unit('')),
    isVisibleOnGuestDashboard: 'boolean',
  });

  const formId = useId();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: arktypeResolver(schema),
    defaultValues: {
      ...link,
      description: link?.description || '',
      iconUrl: link?.iconUrl || '',
      isVisibleOnGuestDashboard: link?.isVisibleOnGuestDashboard || false,
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
    const { title, url, description, iconUrl, isVisibleOnGuestDashboard } = data;
    if (link) {
      editLink.mutate({ body: { title, description, url, iconUrl, isVisibleOnGuestDashboard }, path: { id: link.id } });
    } else {
      addLink.mutate({ body: { title, description, url, iconUrl, isVisibleOnGuestDashboard } });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={mutationExecuting ? undefined : onClose}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{link ? t('LINKS_EDIT_TITLE') : t('LINKS_ADD_TITLE')}</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          <form onSubmit={handleSubmit((values) => onSubmit(values))} id={formId}>
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
            {guestDashboard && (
              <Controller
                name="isVisibleOnGuestDashboard"
                control={control}
                render={({ field }) => (
                  <Switch
                    disabled={mutationExecuting}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="mt-3"
                    label={t('LINKS_FORM_VISIBLE_ON_GUEST_DASHBOARD')}
                  />
                )}
              />
            )}
          </form>
        </DialogDescription>
        <DialogFooter>
          <Button type="submit" intent="success" disabled={mutationExecuting} form={formId}>
            {link ? t('LINKS_EDIT_SUBMIT') : t('LINKS_ADD_SUBMIT')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
