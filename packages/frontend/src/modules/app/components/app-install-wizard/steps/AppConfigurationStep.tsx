import { Switch } from '@/components/ui/Switch';
import { useAppContext } from '@/context/app-context';
import type { AppInfo, FormField } from '@/types/app.types';
import type React from 'react';
import { useEffect, useMemo } from 'react';
import { type Control, Controller, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { FormValues } from '../../install-form/install-form';
import { InstallFormField } from '../../install-form/install-form-field';
import { hiddenTypes } from '../../install-form/form-validators';
import { useWizard } from '../WizardContext';
import { WizardStep } from '../WizardStep';

interface AppConfigurationStepProps {
  stepIndex: number;
  info: AppInfo;
  formFields: FormField[];
  register: UseFormRegister<FormValues>;
  control: Control<FormValues>;
  errors: FieldErrors<FormValues>;
  loading?: boolean;
  initialValues?: { [key: string]: unknown };
}

const typeFilter = (field: FormField) => !hiddenTypes.includes(field.type);

export const AppConfigurationStep: React.FC<AppConfigurationStepProps> = ({
  stepIndex,
  formFields,
  register,
  control,
  errors,
  loading,
  initialValues,
}) => {
  const { t } = useTranslation();
  const { userSettings } = useAppContext();
  const { guestDashboard } = userSettings;
  const { setStepValid } = useWizard();

  const filteredFields = useMemo(() => formFields.filter(typeFilter), [formFields]);
  const hasCustomFields = filteredFields.length > 0;
  const showGuestDashboard = guestDashboard;
  const hasContent = hasCustomFields || showGuestDashboard;

  // Validate step based on required fields
  useEffect(() => {
    // Check if any required custom fields have errors
    const hasRequiredFieldErrors = filteredFields.some((field) => field.required && errors[field.env_variable]);

    setStepValid(stepIndex, !hasRequiredFieldErrors);
  }, [errors, filteredFields, stepIndex, setStepValid]);

  const renderField = (field: FormField) => {
    return (
      <InstallFormField
        loading={loading}
        initialValue={(initialValues ? initialValues[field.env_variable] : field.default) as string}
        register={register}
        field={field}
        control={control}
        key={field.env_variable}
        error={errors[field.env_variable]?.message}
      />
    );
  };

  // Skip this step if there's no content
  if (!hasContent) {
    return null;
  }

  return (
    <WizardStep stepIndex={stepIndex} title={t('APP_INSTALL_FORM_GENERAL')} description={t('WIZARD_STEP_APP_CONFIG_DESCRIPTION')}>
      <div className="flex flex-col gap-3">
        {hasCustomFields && (
          <div className="wizard-section">
            <h4 className="mb-3">{t('APP_INSTALL_FORM_APP_SETTINGS')}</h4>
            <div className="flex flex-col gap-3">{filteredFields.map(renderField)}</div>
          </div>
        )}

        {showGuestDashboard && (
          <div className="wizard-section">
            <h4 className="mb-3">{t('APP_INSTALL_FORM_VISIBILITY_SETTINGS')}</h4>
            <Controller
              control={control}
              name="isVisibleOnGuestDashboard"
              defaultValue={false}
              render={({ field: { onChange, value, ref, ...props } }) => (
                <Switch
                  className="mb-3"
                  ref={ref}
                  checked={value}
                  onCheckedChange={onChange}
                  {...props}
                  label={t('APP_INSTALL_FORM_DISPLAY_ON_GUEST_DASHBOARD')}
                />
              )}
            />
          </div>
        )}
      </div>
    </WizardStep>
  );
};
