"use client";

import { deleteAppstoreAction } from "@/actions/appstores/delete-appstore";
import { useDisclosure } from "@/client/hooks/useDisclosure";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import type React from "react";
import toast from "react-hot-toast";

type IProps = {
  name: string;
  url: string;
};

export const DeleteAppStoreModal: React.FC<IProps> = ({ name, url }) => {
  const router = useRouter();
  const deleteAppStoreDisclosure = useDisclosure();

  const deleteAppStoreMutation = useAction(deleteAppstoreAction, {
    onError: ({ error }) => {
      if (error.serverError) toast.error(error.serverError);
    },
    onSuccess: () => {
      toast.success("Appstore deleted successfully!");
      router.refresh();
    },
  });

  const handleDelete = () => {
    deleteAppStoreMutation.execute({ name, url });
  };

  return (
    <div>
      <Button
        size="sm"
        intent="danger"
        variant="ghost"
        onClick={() => deleteAppStoreDisclosure.open()}
      >
        Delete
      </Button>
      <Dialog
        open={deleteAppStoreDisclosure.isOpen}
        onOpenChange={deleteAppStoreDisclosure.toggle}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete appstore</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <p className="text-muted">This action cannot be undone!</p>
            <Button
              className="mt-3"
              loading={deleteAppStoreMutation.isExecuting}
              intent="danger"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </div>
  );
};
