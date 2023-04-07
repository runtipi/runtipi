import { Switch } from '@/components/ui/Switch';
import { QRCodeSVG } from 'qrcode.react';
import React from 'react';
import { trpc } from '@/utils/trpc';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { useToastStore } from '@/client/state/toastStore';
import { Button } from '@/components/ui/Button';
import { OtpInput } from '@/components/ui/OtpInput';
import { IconLock } from '@tabler/icons-react';

export const SecurityContainer = () => {
  const { addToast } = useToastStore();
  const [password, setPassword] = React.useState('');
  const [key, setKey] = React.useState('');
  const [uri, setUri] = React.useState('');
  const [totpCode, setTotpCode] = React.useState('');

  // Dialog statuses
  const [isSetupTotpOpen, setIsSetupTotpOpen] = React.useState(false);
  const [isDisableTotpOpen, setIsDisableTotpOpen] = React.useState(false);

  const ctx = trpc.useContext();
  const me = trpc.auth.me.useQuery();

  const getTotpUri = trpc.auth.getTotpUri.useMutation({
    onMutate: () => {
      setIsSetupTotpOpen(false);
    },
    onError: (e) => {
      setPassword('');
      addToast({ title: 'Error', description: e.message, status: 'error' });
    },
    onSuccess: (data) => {
      setKey(data.key);
      setUri(data.uri);
    },
  });

  const setupTotp = trpc.auth.setupTotp.useMutation({
    onMutate: () => {},
    onError: (e) => {
      setTotpCode('');
      addToast({ title: 'Error', description: e.message, status: 'error' });
    },
    onSuccess: () => {
      setTotpCode('');
      setKey('');
      setUri('');
      addToast({ title: 'Success', description: 'Two-factor authentication enabled', status: 'success' });
      ctx.auth.me.invalidate();
    },
  });

  const disableTotp = trpc.auth.disableTotp.useMutation({
    onMutate: () => {
      setIsDisableTotpOpen(false);
    },
    onError: (e) => {
      setPassword('');
      addToast({ title: 'Error', description: e.message, status: 'error' });
    },
    onSuccess: () => {
      addToast({ title: 'Success', description: 'Two-factor authentication disabled', status: 'success' });
      ctx.auth.me.invalidate();
    },
  });

  const handleTotp = (enabled: boolean) => {
    if (enabled) setIsSetupTotpOpen(true);
    else {
      setIsDisableTotpOpen(true);
    }
  };

  const renderSetupQr = () => {
    if (!uri || me.data?.totp_enabled) return null;

    return (
      <div className="mt-4">
        <div className="mb-4">
          <p className="text-muted">Scan this QR code with your authenticator app.</p>
          <QRCodeSVG value={uri} />
        </div>
        <div className="mb-4">
          <p className="text-muted">Or enter this key manually.</p>
          <Input name="secret key" value={key} readOnly />
        </div>
        <div className="mb-4">
          <p className="text-muted">Enter the code from your authenticator app.</p>
          <OtpInput value={totpCode} valueLength={6} onChange={(e) => setTotpCode(e)} />
          <Button disabled={totpCode.trim().length < 6} onClick={() => setupTotp.mutate({ totpCode })} className="mt-3 btn-success">
            Enable 2FA
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="card-body">
      <div className="d-flex">
        <IconLock className="me-2" />
        <h2>Two-Factor Authentication</h2>
      </div>
      <p className="text-muted">
        Two-factor authentication (2FA) adds an additional layer of security to your account.
        <br />
        When enabled, you will be prompted to enter a code from your authenticator app when you log in.
      </p>
      {!key && <Switch disabled={!me.isSuccess} onCheckedChange={handleTotp} checked={me.data?.totp_enabled} label="Enable two-factor authentication" />}
      {getTotpUri.isLoading && (
        <div className="progress w-50">
          <div className="progress-bar progress-bar-indeterminate bg-green" />
        </div>
      )}
      {renderSetupQr()}
      <Dialog open={isSetupTotpOpen} onOpenChange={(o) => setIsSetupTotpOpen(o)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Password needed</DialogTitle>
          </DialogHeader>
          <DialogDescription className="d-flex flex-column">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                getTotpUri.mutate({ password });
              }}
            >
              <p className="text-muted">Your password is required to setup two-factor authentication.</p>
              <Input name="password" type="password" onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
              <Button loading={getTotpUri.isLoading} type="submit" className="btn-success mt-3">
                Enable 2FA
              </Button>
            </form>
          </DialogDescription>
        </DialogContent>
      </Dialog>
      <Dialog open={isDisableTotpOpen} onOpenChange={(o) => setIsDisableTotpOpen(o)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Password needed</DialogTitle>
          </DialogHeader>
          <DialogDescription className="d-flex flex-column">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                disableTotp.mutate({ password });
              }}
            >
              <p className="text-muted">Your password is required to disable two-factor authentication.</p>
              <Input name="password" type="password" onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
              <Button loading={disableTotp.isLoading} type="submit" className="btn-danger mt-3">
                Disable 2FA
              </Button>
            </form>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </div>
  );
};
