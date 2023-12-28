import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import React from "react";

type FormValues = { title: string; url: string };

type AddLinkModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: FormValues) => void;
}

export const AddLinkModal: React.FC<AddLinkModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const schema = z
    .object({
      title: z.string().min(1),
      url: z.string().url(),
    });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="sm">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <h5>Title</h5>
          </DialogHeader>
          <DialogDescription>

            <Input
              {...register('title')}
              label='Title'
              placeholder='Runtipi demo'
              error={errors.title?.message} />

            <Input
              {...register('url')}
              className='mt-1'
              label='Link URL'
              placeholder='https://demo.runtipi.io'
              error={errors.url?.message} />

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