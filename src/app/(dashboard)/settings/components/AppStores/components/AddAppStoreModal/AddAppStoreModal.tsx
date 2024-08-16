"use client";

import { addAppstoreAction } from "@/actions/appstores/add-appstore";
import { useDisclosure } from "@/client/hooks/useDisclosure";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

export const AddAppStoreModal = () => {
  const router = useRouter();
  const addAppStoreDisclosure = useDisclosure();

  const schema = z.object({
    name: z.string().max(16),
    url: z.string().url(),
  });

  type FormValues = z.infer<typeof schema>;

  const addAppStoreMutation = useAction(addAppstoreAction, {
    onError: ({ error }) => {
      if (error.serverError) toast.error(error.serverError);
    },
    onSuccess: () => {
      toast.success("Appstore added successfully!");
      router.refresh();
    },
  });

  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (values: FormValues) => {
    addAppStoreMutation.execute(values);
  };

  return (
    <div>
      <Button onClick={() => addAppStoreDisclosure.open()}>Add new</Button>
      <Dialog
        open={addAppStoreDisclosure.isOpen}
        onOpenChange={addAppStoreDisclosure.toggle}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add new appstore</DialogTitle>
          </DialogHeader>
          <DialogDescription className="d-flex flex-column">
            <form onSubmit={handleSubmit(onSubmit)}>
              <p className="text-muted">
                Please enter your repository details.
              </p>
              <Input
                error={formState.errors.name?.message}
                disabled={addAppStoreMutation.isExecuting}
                type="text"
                placeholder="my-awesome-repo"
                {...register("name")}
              />
              <Input
                className="mt-2"
                error={formState.errors.url?.message}
                disabled={addAppStoreMutation.isExecuting}
                type="text"
                placeholder="https://github.com/myusername/my-awesome-repo"
                {...register("url")}
              />
              <Button
                className="mt-3"
                loading={addAppStoreMutation.isExecuting}
                type="submit"
                intent="success"
              >
                Add
              </Button>
            </form>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </div>
  );
};
