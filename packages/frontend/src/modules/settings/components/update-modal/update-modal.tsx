import { updateSystemMutation } from '@/api-client/@tanstack/react-query.gen';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useDisclosure } from '@/lib/hooks/use-disclosure';
import type { TranslatableError } from '@/types/error.types';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import semver from 'semver';

interface Props {
  version: string;
  latest: string;
}

export const UpdateModal = (props: Props) => {
  const { version, latest } = props;
  const { t } = useTranslation();
  const updateDisclosure = useDisclosure();
  const isMajor = semver.major(latest) > semver.major(version);

  const navigate = useNavigate();

  const update = useMutation({
    ...updateSystemMutation(),
    onSuccess: () => {
      updateDisclosure.close();
      navigate('/', { replace: true });
    },
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
  });

  return (
    <>
      <Button className="mt-3" intent="success" onClick={updateDisclosure.open}>
        Update
      </Button>
      <Dialog open={updateDisclosure.isOpen} onOpenChange={updateDisclosure.toggle}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Update</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            {isMajor ? (
              <span className="text-muted">
                This update includes a breaking change, this means that you cannot update through the UI. Please follow the instructions from the
                release notes to update your instance.
              </span>
            ) : (
              <span className="text-muted">
                Are you sure you want to update to version <code>{latest}</code>? You will not be able to use your instance while it's updating.
              </span>
            )}
          </DialogDescription>
          <DialogFooter>
            <Button onClick={updateDisclosure.close}>{isMajor ? 'Close' : 'Cancel'}</Button>
            {!isMajor && (
              <Button intent="success" onClick={() => update.mutate()} loading={update.isPending}>
                Update
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
