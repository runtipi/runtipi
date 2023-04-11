import React from 'react';
import { trpc } from '@/utils/trpc';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { QRCodeSVG } from 'qrcode.react';
import { OtpInput } from '@/components/ui/OtpInput';
import { toast } from 'react-hot-toast';
import { useDisclosure } from '@/client/hooks/useDisclosure';

export const OtpForm = () => {
  const [password, setPassword] = React.useState('');
  const [key, setKey] = React.useState('');
  const [uri, setUri] = React.useState('');
  const [totpCode, setTotpCode] = React.useState('');

  // Dialog statuses
  const setupOtpDisclosure = useDisclosure();
  const disableOtpDisclosure = useDisclosure();

  const ctx = trpc.useContext();
  const me = trpc.auth.me.useQuery();

  const getTotpUri = trpc.auth.getTotpUri.useMutation({
    onMutate: () => {
      setupOtpDisclosure.close();
    },
    onError: (e) => {
      setPassword('');
      toast.error(`Error getting TOTP URI: ${e.message}`);
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
      toast.error(`Error setting up TOTP: ${e.message}`);
    },
    onSuccess: () => {
      setTotpCode('');
      setKey('');
      setUri('');
      toast.success('Two-factor authentication enabled');
      ctx.auth.me.invalidate();
    },
  });

  const disableTotp = trpc.auth.disableTotp.useMutation({
    onMutate: () => {
      disableOtpDisclosure.close();
    },
    onError: (e) => {
      setPassword('');
      toast.error(`Error disabling TOTP: ${e.message}`);
    },
    onSuccess: () => {
      toast.success('Two-factor authentication disabled');
      ctx.auth.me.invalidate();
    },
  });

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

  const handleTotp = (enabled: boolean) => {
    if (enabled) {
      setupOtpDisclosure.open();
    } else {
      disableOtpDisclosure.open();
    }
  };

  return (
    <>
      {!key && <Switch disabled={!me.isSuccess} onCheckedChange={handleTotp} checked={me.data?.totp_enabled} label="Enable two-factor authentication" />}
      {getTotpUri.isLoading && (
        <div className="progress w-50">
          <div className="progress-bar progress-bar-indeterminate bg-green" />
        </div>
      )}
      {renderSetupQr()}
      <Dialog open={setupOtpDisclosure.isOpen} onOpenChange={(o: boolean) => setupOtpDisclosure.toggle(o)}>
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
      <Dialog open={disableOtpDisclosure.isOpen} onOpenChange={(o: boolean) => disableOtpDisclosure.toggle(o)}>
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
    </>
  );
};
