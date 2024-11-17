import { updateUserComposeMutation } from "@/api-client/@tanstack/react-query.gen";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import type { AppInfo, UserCompose } from "@/types/app.types";
import type { TranslatableError } from "@/types/error.types";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import CodeMirror from '@uiw/react-codemirror';
import { yaml } from '@codemirror/lang-yaml';
import "./edit-user-compose-dialog.css"

interface IProps {
    info: AppInfo;
    isOpen: boolean;
    onClose: () => void;
    userCompose: UserCompose;
}
  
export const EditUserComposeDialog: React.FC<IProps> = ({ info, isOpen, onClose, userCompose }) => {
    const { t } = useTranslation();
    const [compose, setCompose] = useState(userCompose.content ? userCompose.content : `services:\n\t${info.id}:\n`);

    const onChange = useCallback((value: string) => {
        setCompose(value);
    }, []);

    const editUserComposeMutatuion = useMutation({
        ...updateUserComposeMutation(),
        onError: (e: TranslatableError) => {
            toast.error(t(e.message, e.intlParams));
        },
        onSuccess: () => {
            toast.success(t("USER_COMPOSE_UPDATE_SUCCESS"));
            onClose();
        }
    })

    const onSubmit = () => {
        // Make sure the file ends with a new line
        if (!compose.endsWith("\n")) {
            setCompose(`${compose}\n`);
        }
        editUserComposeMutatuion.mutate({
            path: { id: info.id },
            body: {
                compose: compose,
            }
        })
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('APP_INSTALL_FORM_EDIT_USER_COMPOSE')}</DialogTitle>
                </DialogHeader>
                    <DialogDescription>
                        <CodeMirror
                            value={compose}
                            height="400px"
                            extensions={[yaml()]}
                            onChange={onChange}
                            theme="dark"
                        />
                    </DialogDescription>
                    {/* Add footer buttons inside scroll area to go below the text area, can go outside to always appear */}
                    <DialogFooter> 
                        <Button intent="danger" onClick={onClose}>{t('USER_COMPOSE_UPDATE_CANCEL')}</Button>
                        <Button intent="success" onClick={onSubmit}>{t('USER_COMPOSE_UPDATE_SUBMIT')}</Button>
                    </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}