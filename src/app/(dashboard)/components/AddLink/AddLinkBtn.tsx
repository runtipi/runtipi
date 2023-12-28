import { Button } from "@/components/ui/Button"
import React from "react"
import { useDisclosure } from "@/client/hooks/useDisclosure";
import { useAction } from "next-safe-action/hook";
import toast from "react-hot-toast";
import { addLinkAction } from "@/actions/custom-links/add-link-action";
import { AddLinkModal } from "./AddLinkModal"

export const AddLinkBtn = () => {

  const addLinkDisclosure = useDisclosure();

  const addLinkMutation = useAction(addLinkAction, {
    onError: (e) => {
      if (e.serverError) toast.error(e.serverError);
    },
    onExecute: () => {
      addLinkDisclosure.close();
    },
  });

  return (
    <>
      <div className="d-flex align-items-stretch align-items-md-center flex-column flex-md-row justify-content-end">
        <Button className="btn-green" onClick={() => addLinkDisclosure.open()}>
          Add custom link
        </Button>
      </div>
      <AddLinkModal 
        isOpen={addLinkDisclosure.isOpen}
        onClose={() => addLinkDisclosure.close()} 
        onSubmit={({title, url}) => addLinkMutation.execute({title, url})} />
    </>
  )
}