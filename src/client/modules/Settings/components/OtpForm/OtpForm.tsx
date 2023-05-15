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
import { useTranslations } from 'next-intl';
import type { MessageKey } from '@/server/utils/errors';

export const OtpForm = () => {
  const globalT = useTranslations();
  const t = useTranslations('settings.security');
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
      toast.error(globalT(e.data?.tError.message as MessageKey, { ...e.data?.tError?.variables }));
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
      toast.error(globalT(e.data?.tError.message as MessageKey, { ...e.data?.tError?.variables }));
    },
    onSuccess: () => {
      setTotpCode('');
      setKey('');
      setUri('');
      toast.success(t('2fa-enable-success'));
      ctx.auth.me.invalidate();
    },
  });

  const disableTotp = trpc.auth.disableTotp.useMutation({
    onMutate: () => {
      disableOtpDisclosure.close();
    },
    onError: (e) => {
      setPassword('');
      toast.error(globalT(e.data?.tError.message as MessageKey, { ...e.data?.tError?.variables }));
    },
    onSuccess: () => {
      toast.success(t('2fa-disable-success'));
      ctx.auth.me.invalidate();
    },
  });

  const renderSetupQr = () => {
    if (!uri || me.data?.totpEnabled) return null;

    return (
      <div className="mt-4">
        <div className="mb-4">
          <p className="text-muted">{t('scan-qr-code')}</p>
          <QRCodeSVG value={uri} />
        </div>
        <div className="mb-4">
          <p className="text-muted">{t('enter-key-manually')}</p>
          <Input name="secret key" value={key} readOnly />
        </div>
        <div className="mb-4">
          <p className="text-muted">{t('enter-2fa-code')}</p>
          <OtpInput value={totpCode} valueLength={6} onChange={(e) => setTotpCode(e)} />
          <Button disabled={totpCode.trim().length < 6} onClick={() => setupTotp.mutate({ totpCode })} className="mt-3 btn-success">
            {t('enable-2fa')}
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
      {!key && <Switch disabled={!me.isSuccess} onCheckedChange={handleTotp} checked={me.data?.totpEnabled} label={t('enable-2fa')} />}
      {getTotpUri.isLoading && (
        <div className="progress w-50">
          <div className="progress-bar progress-bar-indeterminate bg-green" />
        </div>
      )}
      {renderSetupQr()}
      <Dialog open={setupOtpDisclosure.isOpen} onOpenChange={(o: boolean) => setupOtpDisclosure.toggle(o)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('password-needed')}</DialogTitle>
          </DialogHeader>
          <DialogDescription className="d-flex flex-column">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                getTotpUri.mutate({ password });
              }}
            >
              <p className="text-muted">{t('password-needed-hint')}</p>
              <Input name="password" type="password" onChange={(e) => setPassword(e.target.value)} placeholder={t('form.password')} />
              <Button loading={getTotpUri.isLoading} type="submit" className="btn-success mt-3">
                {t('enable-2fa')}
              </Button>
            </form>
          </DialogDescription>
        </DialogContent>
      </Dialog>
      <Dialog open={disableOtpDisclosure.isOpen} onOpenChange={(o: boolean) => disableOtpDisclosure.toggle(o)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('password-needed')}</DialogTitle>
          </DialogHeader>
          <DialogDescription className="d-flex flex-column">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                disableTotp.mutate({ password });
              }}
            >
              <p className="text-muted">{t('password-needed-hint')}</p>
              <Input name="password" type="password" onChange={(e) => setPassword(e.target.value)} placeholder={t('form.password')} />
              <Button loading={disableTotp.isLoading} type="submit" className="btn-danger mt-3">
                {t('disable-2fa')}
              </Button>
            </form>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  );
};
