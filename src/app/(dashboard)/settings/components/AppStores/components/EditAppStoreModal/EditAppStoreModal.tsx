"use client";

import { editAppstoreAction } from "@/actions/appstores/edit-appstore";
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
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import validator from "validator";
import { z } from "zod";

type IProps = {
  name: string;
  url: string;
};

export const EditAppStoreModal: React.FC<IProps> = ({ name, url }) => {
  const router = useRouter();
  const editAppStoreDisclosure = useDisclosure();

  const schema = z.object({
    name: z.string().max(16),
    url: z.string().url(),
    newName: z.string().max(16),
    newUrl: z.string().url(),
  });

  type FormValues = z.infer<typeof schema>;

  const editAppStoreMutation = useAction(editAppstoreAction, {
    onError: ({ error }) => {
      if (error.serverError) toast.error(error.serverError);
    },
    onSuccess: () => {
      toast.success("Appstore edited successfully!");
      router.refresh();
    },
  });

  const validateFields = (values: FormValues) => {
    const errors: { [k in keyof FormValues]?: string } = {};

    if (values.newName && !validator.isLength(values.newName, { max: 16 })) {
      errors.newName = "String must contain at most 16 character(s)";
    }

    if (values.newUrl && !validator.isURL(values.newUrl)) {
      errors.newUrl = "Invalid url";
    }

    return errors;
  };

  const { register, handleSubmit, setValue, setError, formState } =
    useForm<FormValues>({
      resolver: zodResolver(schema),
    });

  useEffect(() => {
    setValue("name", name);
    setValue("url", url);
    setValue("newName", name);
    setValue("newUrl", url);
  }, [setValue, name, url]);

  const validate = (values: FormValues) => {
    const errors = validateFields(values);

    for (const error of Object.entries(errors)) {
      if (error[1]) {
        setError(error[0] as keyof FormValues, { message: error[1] });
      }
    }

    if (Object.keys(errors).length === 0) {
      onSubmit(values);
    }
  };

  const onSubmit = (values: FormValues) => {
    editAppStoreMutation.execute(values);
  };

  return (
    <div>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => editAppStoreDisclosure.open()}
      >
        Edit
      </Button>
      <Dialog
        open={editAppStoreDisclosure.isOpen}
        onOpenChange={editAppStoreDisclosure.toggle}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit appstore</DialogTitle>
          </DialogHeader>
          <DialogDescription className="d-flex flex-column">
            <form onSubmit={handleSubmit(validate)}>
              <p className="text-muted">
                Make your changes to the appstore here.
              </p>
              <Input
                error={formState.errors.newName?.message}
                disabled={editAppStoreMutation.isExecuting}
                type="text"
                placeholder={name}
                {...register("newName")}
              />
              <Input
                className="mt-2"
                error={formState.errors.newUrl?.message}
                disabled={editAppStoreMutation.isExecuting}
                type="text"
                placeholder={url}
                {...register("newUrl")}
              />
              <Button
                className="mt-3"
                loading={editAppStoreMutation.isExecuting}
                type="submit"
                intent="success"
              >
                Save
              </Button>
            </form>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </div>
  );
};
