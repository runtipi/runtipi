import { Alert, AlertDescription, AlertHeading, AlertIcon } from '@/components/ui/Alert/Alert';
import { useAppContext } from '@/context/app-context';
import type { AppInfo, FormField } from '@/types/app.types';
import { extractAppUrn } from '@/utils/app-helpers';
import type { AppUrn } from '@runtipi/common/types';
import { IconAlertCircle, IconCheck, IconX } from '@tabler/icons-react';
import React from 'react';
import { type Control, useWatch } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';
import type { FormValues } from '../../install-form/install-form';
import { hiddenTypes } from '../../install-form/form-validators';
import { useWizard } from '../WizardContext';
import { WizardStep } from '../WizardStep';

interface ReviewStepProps {
  stepIndex: number;
  info: AppInfo;
  formFields: FormField[];
  control: Control<FormValues>;
}

const typeFilter = (field: FormField) => !hiddenTypes.includes(field.type);

export const ReviewStep: React.FC<ReviewStepProps> = ({ stepIndex, info, formFields, control }) => {
  const { t } = useTranslation();
  const { userSettings } = useAppContext();
  const { guestDashboard, localDomain, domain } = userSettings;
  const { setStepValid } = useWizard();

  const formData = useWatch({ control });
  const { appName, appStoreId } = extractAppUrn(info.urn as AppUrn);

  // This step is always valid as it's just for review
  React.useEffect(() => {
    setStepValid(stepIndex, true);
  }, [stepIndex, setStepValid]);

  const renderConfigurationSummary = () => {
    const filteredFields = formFields.filter(typeFilter);

    if (filteredFields.length === 0 && !guestDashboard) {
      return null;
    }

    return (
      <div className="review-section">
        <h4 className="mb-3">{t('APP_INSTALL_FORM_GENERAL')}</h4>
        <div className="review-items">
          {filteredFields.map((field) => {
            const value = formData[field.env_variable];
            const displayValue =
              field.type === 'password' ? '••••••••' : value?.toString() || field.default?.toString() || t('WIZARD_REVIEW_NOT_SET');

            return (
              <div key={field.env_variable} className="review-item d-flex justify-content-between align-items-center py-2 border-bottom">
                <span className="review-label text-muted">{field.label}</span>
                <span className="review-value">{displayValue}</span>
              </div>
            );
          })}

          {guestDashboard && (
            <div className="review-item d-flex justify-content-between align-items-center py-2 border-bottom">
              <span className="review-label text-muted">{t('APP_INSTALL_FORM_DISPLAY_ON_GUEST_DASHBOARD')}</span>
              <span className="review-value">
                {formData.isVisibleOnGuestDashboard ? <IconCheck className="text-success" size={16} /> : <IconX className="text-muted" size={16} />}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderNetworkSummary = () => {
    if (!info.dynamic_config && !info.port) {
      return null;
    }

    return (
      <div className="review-section">
        <h4 className="mb-3">{t('APP_DETAILS_PORT')}</h4>
        <div className="review-items">
          {info.dynamic_config && (
            <div className="review-item d-flex justify-content-between align-items-center py-2 border-bottom">
              <span className="review-label text-muted">{t('APP_INSTALL_FORM_OPEN_PORT')}</span>
              <span className="review-value">
                {formData.openPort ? (
                  <>
                    <IconCheck className="text-success me-2" size={16} />
                    {formData.port || info.port}
                  </>
                ) : (
                  <IconX className="text-muted" size={16} />
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderProxySummary = () => {
    if (!info.port || (!info.exposable && !info.dynamic_config)) {
      return null;
    }

    return (
      <div className="review-section">
        <h4 className="mb-3">{t('APP_INSTALL_FORM_REVERSE_PROXY')}</h4>
        <div className="review-items">
          {info.dynamic_config && info.exposable && (
            <>
              <div className="review-item d-flex justify-content-between align-items-center py-2 border-bottom">
                <span className="review-label text-muted">{t('APP_INSTALL_FORM_EXPOSE_LOCAL')}</span>
                <span className="review-value">
                  {formData.exposedLocal ? (
                    <>
                      <IconCheck className="text-success me-2" size={16} />
                      {`https://${formData.localSubdomain || info.urn.split(':').join('-')}.${localDomain}`}
                    </>
                  ) : (
                    <IconX className="text-muted" size={16} />
                  )}
                </span>
              </div>

              <div className="review-item d-flex justify-content-between align-items-center py-2 border-bottom">
                <span className="review-label text-muted">{t('APP_INSTALL_FORM_ENABLE_AUTH')}</span>
                <span className="review-value">
                  {formData.enableAuth ? <IconCheck className="text-success" size={16} /> : <IconX className="text-muted" size={16} />}
                </span>
              </div>
            </>
          )}

          {info.exposable && (
            <div className="review-item d-flex justify-content-between align-items-center py-2 border-bottom">
              <span className="review-label text-muted">{t('APP_INSTALL_FORM_EXPOSE_APP')}</span>
              <span className="review-value">
                {formData.exposed ? (
                  <>
                    <IconCheck className="text-success me-2" size={16} />
                    {formData.domain || `${appName}-${appStoreId}.${domain || 'example.com'}`}
                  </>
                ) : (
                  <IconX className="text-muted" size={16} />
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <WizardStep stepIndex={stepIndex} title={t('WIZARD_STEP_REVIEW_TITLE')} description={t('WIZARD_STEP_REVIEW_DESCRIPTION')}>
      <div className="flex flex-col gap-4">
        {info.force_pull && (
          <Alert variant="warning">
            <AlertIcon>
              <IconAlertCircle stroke={2} />
            </AlertIcon>
            <div>
              <AlertHeading>{t('WARNING')}</AlertHeading>
              <AlertDescription>
                <Trans i18nKey={'APP_INSTALL_FORM_FORCE_PULL_WARNING'} values={{ tag: info.version }} components={{ code: <code /> }} />
              </AlertDescription>
            </div>
          </Alert>
        )}

        <div className="review-summary">
          <div className="app-info mb-4">
            <h3 className="mb-2">{info.name}</h3>
            <p className="text-muted">{info.short_desc}</p>
          </div>
          {renderConfigurationSummary()}
          {renderNetworkSummary()}
          {renderProxySummary()}
        </div>
      </div>
    </WizardStep>
  );
};
