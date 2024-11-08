import { disableTotpAction } from '@/actions/settings/disable-totp';
import { getTotpUriAction } from '@/actions/settings/get-totp-uri';
import { setupTotpAction } from '@/actions/settings/setup-totp-action';
import { useDisclosure } from '@/client/hooks/useDisclosure';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { OtpInput } from '@/components/ui/OtpInput';
import { Switch } from '@/components/ui/Switch';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { QRCodeSVG } from 'qrcode.react';
import React from 'react';
import { toast } from 'react-hot-toast';

export const OtpForm = (props: { totpEnabled: boolean }) => {
  const { totpEnabled } = props;
  const t = useTranslations();
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
    onError: ({ error }) => {
      setPassword('');
      if (error.serverError) toast.error(error.serverError);
    },
    onSuccess: ({ data }) => {
      if (!data) return;
      setKey(data.key);
      setUri(data.uri);
    },
  });

  const setupTotpMutation = useAction(setupTotpAction, {
    onError: ({ error }) => {
      setTotpCode('');
      if (error.serverError) toast.error(error.serverError);
    },
    onSuccess: () => {
      setTotpCode('');
      setKey('');
      setUri('');
      toast.success(t('SETTINGS_SECURITY_2FA_ENABLE_SUCCESS'));
    },
  });

  const disableTotpMutation = useAction(disableTotpAction, {
    onExecute: () => {
      disableOtpDisclosure.close();
    },
    onError: ({ error }) => {
      setPassword('');
      if (error.serverError) toast.error(error.serverError);
    },
    onSuccess: () => {
      toast.success(t('SETTINGS_SECURITY_2FA_DISABLE_SUCCESS'));
    },
  });

  const renderSetupQr = () => {
    if (!uri || totpEnabled) return null;

    return (
      <div className="mt-4">
        <div className="mb-4">
          <p className="text-muted">{t('SETTINGS_SECURITY_SCAN_QR_CODE')}</p>
          <QRCodeSVG value={uri} />
        </div>
        <div className="mb-4">
          <p className="text-muted">{t('SETTINGS_SECURITY_ENTER_KEY_MANUALLY')}</p>
          <Input name="secret key" value={key} readOnly />
        </div>
        <div className="mb-4">
          <p className="text-muted">{t('SETTINGS_SECURITY_ENTER_2FA_CODE')}</p>
          <OtpInput value={totpCode} valueLength={6} onChange={(e) => setTotpCode(e)} />
          <Button disabled={totpCode.trim().length < 6} onClick={() => setupTotpMutation.execute({ totpCode })} intent="success" className="mt-3">
            {t('SETTINGS_SECURITY_ENABLE_2FA')}
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
      {!key && <Switch onCheckedChange={handleTotp} checked={totpEnabled} label={t('SETTINGS_SECURITY_ENABLE_2FA')} />}
      {getTotpUriMutation.status === 'executing' && (
        <div className="progress w-50">
          <div className="progress-bar progress-bar-indeterminate bg-green" />
        </div>
      )}
      {renderSetupQr()}
      <Dialog open={setupOtpDisclosure.isOpen} onOpenChange={(o: boolean) => setupOtpDisclosure.toggle(o)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('SETTINGS_SECURITY_PASSWORD_NEEDED')}</DialogTitle>
          </DialogHeader>
          <DialogDescription className="d-flex flex-column">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                getTotpUriMutation.execute({ password });
              }}
            >
              <p className="text-muted">{t('SETTINGS_SECURITY_PASSWORD_NEEDED_HINT')}</p>
              <Input
                name="password"
                type="password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('SETTINGS_SECURITY_PASSWORD_NEEDED')}
              />
              <Button loading={getTotpUriMutation.status === 'executing'} type="submit" intent="success" className="mt-3">
                {t('SETTINGS_SECURITY_ENABLE_2FA')}
              </Button>
            </form>
          </DialogDescription>
        </DialogContent>
      </Dialog>
      <Dialog open={disableOtpDisclosure.isOpen} onOpenChange={(o: boolean) => disableOtpDisclosure.toggle(o)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{t('SETTINGS_SECURITY_PASSWORD_NEEDED')}</DialogTitle>
          </DialogHeader>
          <DialogDescription className="d-flex flex-column">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                disableTotpMutation.execute({ password });
              }}
            >
              <p className="text-muted">{t('SETTINGS_SECURITY_PASSWORD_NEEDED_HINT')}</p>
              <Input
                name="password"
                type="password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('SETTINGS_SECURITY_PASSWORD_NEEDED')}
              />
              <Button loading={disableTotpMutation.status === 'executing'} type="submit" intent="danger" className="mt-3">
                {t('SETTINGS_SECURITY_DISABLE_2FA')}
              </Button>
            </form>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  );
};
