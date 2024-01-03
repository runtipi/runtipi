"use client"

import React from "react"
import { useDisclosure } from "@/client/hooks/useDisclosure";
import { useAction } from "next-safe-action/hook";
import toast from "react-hot-toast";
import { addLinkAction } from "@/actions/custom-links/add-link-action";
import clsx from "clsx";
import { IconNewSection } from "@tabler/icons-react";
import { AddLinkModal } from "./AddLinkModal";
import styles from "./addLink.module.css";

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
      <button
        className={clsx("col-sm-6 col-lg-4", styles.addLinkButton)}
        onClick={() => addLinkDisclosure.open()}>
        <div>
          <div className="card card-sm card-link">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <span className="me-3">
                  <IconNewSection size={60} stroke={1.25} color="#A4A4A4"/>
                </span>
                <div>
                  <div className="d-flex h-3 align-items-center">
                    <span className="h4 me-2 mb-1 fw-bolder">Add custom link</span>
                  </div>
                  <div className="text-muted">Add a custom link to the apps section</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </button>
      <AddLinkModal
        isOpen={addLinkDisclosure.isOpen}
        onClose={() => addLinkDisclosure.close()}
        onSubmit={({ title, url, iconURL }) => addLinkMutation.execute({ title, url, iconURL })} />
    </>
  )
}