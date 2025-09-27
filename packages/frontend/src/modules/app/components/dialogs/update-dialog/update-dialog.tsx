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
import { Switch } from "@/components/ui/Switch";
import type { AppInfo } from "@/types/app.types";
import type { TranslatableError } from "@/types/error.types";
import { useMutation } from "@tanstack/react-query";
import type React from "react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import CodeMirror from "@uiw/react-codemirror";
import { copilot } from "@uiw/codemirror-theme-copilot";
import { unifiedMergeView } from "@codemirror/merge";
import {
  StepContent,
  Stepper,
  StepTrigger,
  StepTriggerList,
} from "@/components/ui/Stepper/Stepper";
import type { Sizes } from "@/components/ui/Dialog/Dialog";
import { motion } from "framer-motion";
import {
  Alert,
  AlertDescription,
  AlertHeading,
  AlertIcon,
} from "@/components/ui/Alert/Alert";
import { IconInfoCircle } from "@tabler/icons-react";

interface IProps {
  newVersion: string;
  info: Pick<AppInfo, "id" | "name" | "urn">;
  isOpen: boolean;
  onClose: () => void;
  newConfig: string;
  currentConfig: string;
  newCompose: string;
  currentCompose: string;
}

const SIZE_MAP: Record<number, Sizes> = {
  0: "md",
  1: "lg",
  2: "lg",
  3: "md",
};

export const UpdateDialog: React.FC<IProps> = ({
  info,
  newVersion,
  isOpen,
  newConfig,
  currentConfig,
  newCompose,
  currentCompose,
  onClose,
}) => {
  const { t } = useTranslation();
  const [backupApp, setBackupApp] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setBackupApp(true);
    }
  }, [isOpen]);

  const update = useMutation({
    ...updateAppMutation(),
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
    onMutate: () => {
      onClose();
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 0.2,
        }}
        key={currentStep}
      >
        <DialogContent size={SIZE_MAP[currentStep]}>
          <DialogHeader>
            <DialogTitle>
              {t("APP_UPDATE_FORM_TITLE", { name: info.name })}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <Stepper currentStep={currentStep}>
              <StepTriggerList>
                <StepTrigger
                  step={0}
                  title="Information"
                  onStepChange={setCurrentStep}
                />
                <StepTrigger
                  step={1}
                  title="Configuration"
                  onStepChange={setCurrentStep}
                />
                <StepTrigger
                  step={2}
                  title="Compose"
                  onStepChange={setCurrentStep}
                />
                <StepTrigger
                  step={3}
                  title="Backup"
                  onStepChange={setCurrentStep}
                />
              </StepTriggerList>
              <div className="mt-2">
                <StepContent step={0}>
                  <div className="text-muted">
                    {t("APP_UPDATE_FORM_SUBTITLE_1")} <b>{newVersion}</b> ?
                    <br />
                    Click the button below to have a look at the changes and
                    update.
                  </div>
                </StepContent>
                <StepContent step={1}>
                  <div className="text-muted">
                    Review the changes to the app configuration file.
                  </div>
                  <CodeMirror
                    value={newConfig}
                    readOnly={true}
                    height="400px"
                    theme={copilot}
                    className="mt-3"
                    extensions={[
                      unifiedMergeView({
                        original: currentConfig,
                        mergeControls: false,
                      }),
                    ]}
                  />
                </StepContent>
                <StepContent step={2}>
                  <div className="text-muted">
                    Review the changes to the app compose file.
                  </div>
                  <CodeMirror
                    value={newCompose}
                    readOnly={true}
                    height="400px"
                    theme={copilot}
                    className="mt-3"
                    extensions={[
                      unifiedMergeView({
                        original: currentCompose,
                        mergeControls: false,
                      }),
                    ]}
                  />
                  <Alert variant="info" className="mt-3">
                    <AlertIcon>
                      <IconInfoCircle stroke={2} />
                    </AlertIcon>
                    <div>
                      <AlertHeading>Note</AlertHeading>
                      <AlertDescription>
                        If no changes are shown, then the app's compose file has
                        not changed.
                      </AlertDescription>
                    </div>
                  </Alert>
                </StepContent>
                <StepContent step={3}>
                  <div className="text-muted">
                    It is highly recommended to backup the app before updating.
                    You can always restore from a backup if something goes
                    wrong.
                  </div>
                  <Switch
                    checked={backupApp}
                    onCheckedChange={setBackupApp}
                    label={t("APP_UPDATE_FORM_BACKUP")}
                    className="mt-3"
                  />
                </StepContent>
              </div>
            </Stepper>
          </DialogDescription>
          <DialogFooter>
            {currentStep > 0 && (
              <Button
                onClick={() => setCurrentStep((s) => s - 1)}
                className="me-2"
              >
                Previous
              </Button>
            )}
            {currentStep < 3 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep((s) => s + 1)}
              >
                Next
              </Button>
            )}
            {currentStep === 3 && (
              <Button
                onClick={() =>
                  update.mutate({
                    path: { urn: info.urn },
                    body: { performBackup: backupApp },
                  })
                }
                intent="success"
              >
                Update
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </motion.div>
    </Dialog>
  );
};
