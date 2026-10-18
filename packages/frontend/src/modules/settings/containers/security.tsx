import { ChangePasswordForm } from '../components/change-password-form/change-password-form';
import { ChangeUsernameForm } from '../components/change-username-form/change-username-form';
import { OtpForm } from '../components/otp-form/otp-form';

export const SecurityContainer = (props: { totpEnabled: boolean; username?: string }) => {
  const { totpEnabled, username } = props;

  return (
    <div className="rt-settings-stack">
      <ChangeUsernameForm username={username} />
      <ChangePasswordForm />
      <OtpForm totpEnabled={totpEnabled} />
    </div>
  );
};
