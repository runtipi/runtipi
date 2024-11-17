import { updateUserComposeMutation } from "@/api-client/@tanstack/react-query.gen";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { ScrollArea } from "@/components/ui/ScrollArea";
import type { AppInfo, UserCompose } from "@/types/app.types";
import type { TranslatableError } from "@/types/error.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useId } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import TextareaAutosize from 'react-textarea-autosize';
import { z } from "zod";

interface IProps {
    info: AppInfo;
    isOpen: boolean;
    onClose: () => void;
    userCompose: UserCompose;
}

export const EditUserComposeDialog: React.FC<IProps> = ({ info, isOpen, onClose, userCompose }) => {
    const { t } = useTranslation();
    const formId = useId();

    const schema = z.object({
        data: z.string(),
    })

    type FormValues = z.infer<typeof schema>

    const { register, handleSubmit } = useForm<FormValues>({
        resolver: zodResolver(schema),
    });

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

    const onSubmit = (values: FormValues) => {
        // Make sure the file ends with a new line
        if (!values.data.endsWith("\n")) {
            values.data += "\n";
        }
        editUserComposeMutatuion.mutate({
            path: { id: info.id },
            body: {
                compose: values.data,
            }
        })
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('APP_INSTALL_FORM_EDIT_USER_COMPOSE')}</DialogTitle>
                </DialogHeader>
                <ScrollArea maxHeight={500}>
                    <DialogDescription>
                        <form onSubmit={handleSubmit(onSubmit)} id={formId}>
                            <TextareaAutosize className="form-control" {...register("data")}>
                                    {userCompose.content ? userCompose.content : `services:\n\t${info.id}:`}
                            </TextareaAutosize>
                        </form>
                    </DialogDescription>
                    {/* Add footer buttons inside scroll area to go below the text area, can go outside to always appear */}
                    <DialogFooter> 
                        <Button intent="danger" onClick={onClose}>{t('USER_COMPOSE_UPDATE_CANCEL')}</Button>
                        <Button intent="success" type="submit" form={formId}>{t('USER_COMPOSE_UPDATE_SUBMIT')}</Button>
                    </DialogFooter>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}