import { updateAppMutation } from "@/api-client/@tanstack/react-query.gen";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Stepper } from "@/components/ui/Stepper/Stepper";
import { Switch } from "@/components/ui/Switch";
import type { AppInfo } from "@/types/app.types";
import type { TranslatableError } from "@/types/error.types";
import { useMutation } from "@tanstack/react-query";
import type React from "react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import type { Step } from "@stepperize/core";

interface IProps {
  newVersion: string;
  info: Pick<AppInfo, "id" | "name" | "urn">;
  isOpen: boolean;
  onClose: () => void;
}

export const UpdateDialog: React.FC<IProps> = ({
  info,
  newVersion,
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const [backupApp, setBackupApp] = useState(true);

  const update = useMutation({
    ...updateAppMutation(),
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
    onMutate: () => {
      onClose();
    },
  });

  const steps: Step[] = [
    { id: "ownload", title: "Download", description: "Downloading update" },
    { id: "install", title: "Install", description: "Installing update" },
    { id: "finalize", title: "Finalize", description: "Finalizing update" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>
            {t("APP_UPDATE_FORM_TITLE", { name: info.name })}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>
          <Stepper
            steps={steps}
            stepComponents={[
              <div key="download">Downloading...</div>,
              <div key="install">Installing...</div>,
              <div key="finalize">Finalizing...</div>,
            ]}
          ></Stepper>
          <div className="text-muted">
            {t("APP_UPDATE_FORM_SUBTITLE_1")} <b>{newVersion}</b> ?<br />
            {t("APP_UPDATE_FORM_SUBTITLE_2")}
          </div>
          <div className="mt-3">
            <Switch
              checked={backupApp}
              onCheckedChange={setBackupApp}
              label={t("APP_UPDATE_FORM_BACKUP")}
            />
          </div>
        </DialogDescription>
        <DialogFooter>
          <Button
            onClick={() =>
              update.mutate({
                path: { urn: info.urn },
                body: { performBackup: backupApp },
              })
            }
            intent="success"
          >
            {t("APP_UPDATE_FORM_SUBMIT")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
