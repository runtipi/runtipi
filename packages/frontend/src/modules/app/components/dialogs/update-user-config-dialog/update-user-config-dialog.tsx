import { updateUserConfigMutation } from "@/api-client/@tanstack/react-query.gen";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import type { AppInfo, UserConfig } from "@/types/app.types";
import type { TranslatableError } from "@/types/error.types";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import CodeMirror from '@uiw/react-codemirror';
import { yaml } from '@codemirror/lang-yaml';
import "./update-user-config-dialog.css"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";

interface IProps {
    info: AppInfo;
    isOpen: boolean;
    onClose: () => void;
    userConfig: UserConfig;
}
  
export const UpdateUserConfigDialog: React.FC<IProps> = ({ info, isOpen, onClose, userConfig }) => {
    const { t } = useTranslation();
    const [compose, setCompose] = useState(userConfig.compose ? userConfig.compose : `services:\n\t${info.id}:\n`);
    const [env, setEnv] = useState(userConfig.env ? userConfig.env : "");

    const onComposeChange = useCallback((value: string) => {
        setCompose(value);
    }, []);

    const onEnvChange = useCallback((value: string) => {
        setEnv(value);
    }, []);

    const updateUserConfig = useMutation({
        ...updateUserConfigMutation(),
        onError: (e: TranslatableError) => {
            toast.error(t(e.message, e.intlParams));
        },
        onSuccess: () => {
            toast.success(t("USER_CONFIG_UPDATE_SUCCESS"));
            onClose();
        }
    })

    const onSubmit = () => {
        updateUserConfig.mutate({
            path: { id: info.id },
            body: {
                compose: compose,
                env: env
            }
        })
    }

    const navigate = useNavigate();

    // UCM stands for User Config Modal
    const handleTabChange = (newTab: string) => {
        navigate(`?ucm-tab=${newTab}`, { replace: true });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('APP_INSTALL_FORM_EDIT_USER_CONFIG')}</DialogTitle>
                </DialogHeader>
                    <DialogDescription>
                        <Tabs defaultValue="compose" orientation="vertical">
                            <TabsList>
                                <TabsTrigger onClick={() => handleTabChange('compose')} value="compose">{t('USER_CONFIG_UPDATE_COMPOSE')}</TabsTrigger>
                                <TabsTrigger onClick={() => handleTabChange('env')} value="env">{t('USER_CONFIG_UPDATE_ENV')}</TabsTrigger>
                            </TabsList>
                            <TabsContent value="compose">
                                <CodeMirror
                                    value={compose}
                                    height="400px"
                                    extensions={[yaml()]}
                                    onChange={onComposeChange}
                                    theme="dark"
                                />
                            </TabsContent>
                            <TabsContent value="env">
                                <CodeMirror
                                    value={env}
                                    height="400px"
                                    onChange={onEnvChange}
                                    theme="dark"
                                />
                            </TabsContent>
                        </Tabs>
                    </DialogDescription>
                    {/* Add footer buttons inside scroll area to go below the text area, can go outside to always appear */}
                    <DialogFooter> 
                        <Button intent="danger" onClick={onClose}>{t('USER_CONFIG_UPDATE_CANCEL')}</Button>
                        <Button intent="success" onClick={onSubmit}>{t('USER_CONFIG_UPDATE_SUBMIT')}</Button>
                    </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}