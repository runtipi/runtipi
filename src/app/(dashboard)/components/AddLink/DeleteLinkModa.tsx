import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { useAction } from 'next-safe-action/hook';
import { useRouter } from 'next/navigation';
import { deleteLinkAction } from "@/actions/custom-links/add-link-action";
import toast from "react-hot-toast";

type DeleteLinkModalProps = {
  isOpen: boolean;
  onClose: () => void;
  linkId: number;
  linkTitle: string;
}

export const DeleteLinkModal: React.FC<DeleteLinkModalProps> = ({ isOpen, onClose, linkTitle, linkId }) => {

  const router = useRouter();

  const deleteLinkMutation = useAction(deleteLinkAction, {
    onError: (e) => {
      if (e.serverError) toast.error(e.serverError);
    },
    onSuccess: () => {
      router.refresh();
      onClose();
      toast.success('Deleted succesfully');
    }  
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="sm">
        <DialogHeader>
          <h5 className="modal-title">Delete custom link <code>{linkTitle}</code> ?</h5>
        </DialogHeader>
        <DialogDescription>
          <div className="text-muted">
            Are you sure you want to delete this custom link?
          </div>
        </DialogDescription>
        <DialogFooter>
          <Button className="btn-danger" onClick={() => deleteLinkMutation.execute(linkId)}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};