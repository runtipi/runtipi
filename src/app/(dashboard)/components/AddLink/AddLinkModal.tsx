import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import React from "react";
import { useAction } from "next-safe-action/hook";
import { addLinkAction } from "@/actions/custom-links/add-link-action";
import toast from "react-hot-toast";
import { useRouter } from 'next/navigation';

type FormValues = { title: string; url: string, iconURL: string };

type AddLinkModalProps = {
  isOpen: boolean;
  onClose: () => void;
}

export const AddLinkModal: React.FC<AddLinkModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();

  const schema = z
  .object({
    title: z.string().min(1).max(20),
    url: z.string().url(),
    iconURL: z.string().url().or(z.literal("")),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const addLinkMutation = useAction(addLinkAction, {
    onError: (e) => {
      if (e.serverError) toast.error(e.serverError);
    },
    onExecute: () => {
      reset();
      onClose();
      toast.success('Added succesfully');
      router.push('/apps');
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="sm">
        <form onSubmit={handleSubmit(({ title, url, iconURL }) => addLinkMutation.execute({ title, url, iconURL }))}>
          <DialogHeader>
            <h5 className="modal-title">Add custom link</h5>
          </DialogHeader>
          <DialogDescription>

            <Input
              {...register('title')}
              label='Title'
              placeholder='Runtipi demo'
              error={errors.title?.message} />

            <Input
              {...register('url')}
              className='mt-3'
              label='Link URL'
              placeholder='https://demo.runtipi.io'
              error={errors.url?.message} />

            <Input
              {...register('iconURL')}
              className='mt-3'
              label='Icon URL'
              placeholder='Upload yours to svgshare.com'
              error={errors.iconURL?.message} />

          </DialogDescription>
          <DialogFooter>
            <Button type='submit' className="btn-success">
              Submit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}