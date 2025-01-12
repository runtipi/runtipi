import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";;
import type { useDisclosure } from "@/lib/hooks/use-disclosure";

interface IProps {
    onEnable: () => void;
    advancedSettingsDisclosure: ReturnType<typeof useDisclosure>;
}

export const AdvancedSettingsModal = (props: IProps) => {
    const { advancedSettingsDisclosure, onEnable } = props;

    return (
        <div>
            <Dialog open={advancedSettingsDisclosure.isOpen} onOpenChange={advancedSettingsDisclosure.toggle}>
                <DialogContent size="sm" type="warning">
                    <DialogHeader>
                        <DialogTitle>Enable advanced settings?</DialogTitle>
                    </DialogHeader>
                    <DialogDescription>
                        <span className="text-muted">Advanced settings are intended for experienced users only. Are you sure you want to enable them? Misconfiguring these settings can result in a broken install.</span>
                    </DialogDescription>
                    <DialogFooter>
                        <Button onClick={() => advancedSettingsDisclosure.close()}>
                            Cancel
                        </Button>
                        <Button intent="warning" onClick={onEnable}>
                            Enable
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}