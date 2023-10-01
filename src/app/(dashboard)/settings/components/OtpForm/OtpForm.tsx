import React from 'react';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { QRCodeSVG } from 'qrcode.react';
import { OtpInput } from '@/components/ui/OtpInput';
import { toast } from 'react-hot-toast';
import { useDisclosure } from '@/client/hooks/useDisclosure';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hook';
import { getTotpUriAction } from '@/actions/settings/get-totp-uri';
import { setupTotpAction } from '@/actions/settings/setup-totp-action';
import { disableTotpAction } from '@/actions/settings/disable-totp';

export const OtpForm = (props: { totpEnabled: boolean }) => {
  const { totpEnabled } = props;
  const t = useTranslations('settings.security');
  const [password, setPassword] = React.useState('');
  const [key, setKey] = React.useState('');
  const [uri, setUri] = React.useState('');
  const [totpCode, setTotpCode] = React.useState('');

  // Dialog statuses
  const setupOtpDisclosure = useDisclosure();
  const disableOtpDisclosure = useDisclosure();

  const getTotpUriMutation = useAction(getTotpUriAction, {
    onExecute: () => {
      setupOtpDisclosure.close();
    },
    onSuccess: (data) => {
      if (!data.success) {
        setPassword('');
        toast.error(data.failure.reason);
      } else {
        setKey(data.key);
        setUri(data.uri);
      }
    },
  });

  const setupTotpMutation = useAction(setupTotpAction, {
    onSuccess: (data) => {
      if (!data.success) {
        setTotpCode('');
        toast.error(data.failure.reason);
      } else {
        setTotpCode('');
        setKey('');
        setUri('');
        toast.success(t('2fa-enable-success'));
        // ctx.auth.me.invalidate();
      }
    },
  });

  const disableTotpMutation = useAction(disableTotpAction, {
    onExecute: () => {
      disableOtpDisclosure.close();
    },
    onSuccess: (data) => {
      if (!data.success) {
        setPassword('');
        toast.error(data.failure.reason);
      } else {
        toast.success(t('2fa-disable-success'));
        //ctx.auth.me.invalidate();
      }
    },
  });

  const renderSetupQr = () => {
    if (!uri || totpEnabled) return null;

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
          <Button disabled={totpCode.trim().length < 6} onClick={() => setupTotpMutation.execute({ totpCode })} className="mt-3 btn-success">
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
      {!key && <Switch onCheckedChange={handleTotp} checked={totpEnabled} label={t('enable-2fa')} />}
      {getTotpUriMutation.isExecuting && (
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
                getTotpUriMutation.execute({ password });
              }}
            >
              <p className="text-muted">{t('password-needed-hint')}</p>
              <Input name="password" type="password" onChange={(e) => setPassword(e.target.value)} placeholder={t('form.password')} />
              <Button loading={getTotpUriMutation.isExecuting} type="submit" className="btn-success mt-3">
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
                disableTotpMutation.execute({ password });
              }}
            >
              <p className="text-muted">{t('password-needed-hint')}</p>
              <Input name="password" type="password" onChange={(e) => setPassword(e.target.value)} placeholder={t('form.password')} />
              <Button loading={disableTotpMutation.isExecuting} type="submit" className="btn-danger mt-3">
                {t('disable-2fa')}
              </Button>
            </form>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  );
};
