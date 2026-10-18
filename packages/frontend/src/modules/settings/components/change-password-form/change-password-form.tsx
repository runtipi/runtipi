import { changePasswordMutation } from '@/api-client/@tanstack/react-query.gen';
import type { TranslatableError } from '@/types/error.types';
import { arktypeResolver } from '@hookform/resolvers/arktype';
import { useMutation } from '@tanstack/react-query';
import { type } from 'arktype';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { SettingsPanel } from '../settings-ui/settings-ui';

export const ChangePasswordForm = () => {
  const { t } = useTranslation();

  const schema = type({
    currentPassword: type('string').atLeastLength(1),
    newPassword: type('string')
      .atLeastLength(8)
      .configure({ message: t('SETTINGS_SECURITY_FORM_PASSWORD_LENGTH') }),
    newPasswordConfirm: type('string')
      .atLeastLength(8)
      .configure({ message: t('SETTINGS_SECURITY_FORM_PASSWORD_LENGTH') })
      // cross-field validation (match `newPassword`)
      .narrow((confirm, ctx) => confirm === (ctx.root as { newPassword?: string }).newPassword)
      .configure({ message: t('SETTINGS_SECURITY_FORM_PASSWORD_MATCH') }),
  });

  type FormValues = typeof schema.infer;

  const changePassword = useMutation({
    ...changePasswordMutation(),
    onError: (e: TranslatableError) => {
      toast.error(t(e.message, e.intlParams));
    },
    onSuccess: () => {
      toast.success(t('SETTINGS_SECURITY_PASSWORD_CHANGE_SUCCESS'));
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: arktypeResolver(schema),
  });

  const onSubmit = (values: FormValues) => {
    changePassword.mutate({ body: values });
  };

  return (
    <SettingsPanel title={t('SETTINGS_SECURITY_PASSWORD_TITLE')} description={t('SETTINGS_SECURITY_CHANGE_PASSWORD_SUBTITLE')}>
      <form onSubmit={handleSubmit(onSubmit)} className="rt-set-panel__body rt-password-form">
        <div className="rt-set-fields rt-set-fields--full">
          <div>
            <label className="rt-label" htmlFor="current-password">
              {t('SETTINGS_SECURITY_FORM_CURRENT_PASSWORD')}
            </label>
            <input
              id="current-password"
              className="rt-field"
              type="password"
              autoComplete="current-password"
              disabled={changePassword.isPending}
              aria-invalid={Boolean(errors.currentPassword)}
              {...register('currentPassword')}
            />
            {errors.currentPassword && <div className="rt-set-field-error">{errors.currentPassword.message}</div>}
          </div>
        </div>
        <div className="rt-set-fields">
          <div>
            <label className="rt-label" htmlFor="new-password">
              {t('SETTINGS_SECURITY_FORM_NEW_PASSWORD')}
            </label>
            <input
              id="new-password"
              className="rt-field"
              type="password"
              autoComplete="new-password"
              disabled={changePassword.isPending}
              aria-invalid={Boolean(errors.newPassword)}
              {...register('newPassword')}
            />
            {errors.newPassword && <div className="rt-set-field-error">{errors.newPassword.message}</div>}
          </div>
          <div>
            <label className="rt-label" htmlFor="confirm-password">
              {t('SETTINGS_SECURITY_FORM_CONFIRM_PASSWORD')}
            </label>
            <input
              id="confirm-password"
              className="rt-field"
              type="password"
              autoComplete="new-password"
              disabled={changePassword.isPending}
              aria-invalid={Boolean(errors.newPasswordConfirm)}
              {...register('newPasswordConfirm')}
            />
            {errors.newPasswordConfirm && <div className="rt-set-field-error">{errors.newPasswordConfirm.message}</div>}
          </div>
        </div>
        <div>
          <button type="submit" className="rt-btn" disabled={changePassword.isPending}>
            {t('SETTINGS_SECURITY_FORM_CHANGE_PASSWORD_SUBMIT')}
          </button>
        </div>
      </form>
    </SettingsPanel>
  );
};
