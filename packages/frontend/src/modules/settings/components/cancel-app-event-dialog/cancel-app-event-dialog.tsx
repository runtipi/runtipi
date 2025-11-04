import { cancelAppEventMutation } from '@/api-client/@tanstack/react-query.gen';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { useDisclosure } from '@/lib/hooks/use-disclosure';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const CancelAppEventDialog = ({ id }: { id: string }) => {
  const cancelAppEventDisclosure = useDisclosure();

  const cancelAppEvent = useMutation({
    ...cancelAppEventMutation(),
    onSuccess: () => {
      cancelAppEventDisclosure.close();
      toast.success('Event cancelled successfully');
    },
    onError: () => {
      toast.error('Failed to cancel event');
    },
  });

  return (
    <>
      <Button variant="ghost" intent="danger" onClick={() => cancelAppEventDisclosure.open()}>
        Cancel
      </Button>
      <Dialog open={cancelAppEventDisclosure.isOpen} onOpenChange={cancelAppEventDisclosure.toggle}>
        <DialogContent size="sm" type="danger">
          <DialogHeader>
            <DialogTitle>Cancel app event?</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <span className="text-muted">Are you sure you want to cancel this event? Cancelling may result in loss of data!</span>
          </DialogDescription>
          <DialogFooter>
            <Button loading={cancelAppEvent.isPending} onClick={() => cancelAppEventDisclosure.close()}>
              Keep event running
            </Button>
            <Button intent="danger" loading={cancelAppEvent.isPending} onClick={() => cancelAppEvent.mutate({ path: { requestId: id } })}>
              Cancel Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
