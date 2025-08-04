import { Button } from '@/components/ui/Button';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import type React from 'react';
import { useTranslation } from 'react-i18next';
import { useWizard } from './WizardContext';

interface WizardNavigationProps {
  onCancel: () => void;
  onFinish: () => void;
  isFinishing?: boolean;
  canGoNext?: boolean;
  showCancel?: boolean;
}

export const WizardNavigation: React.FC<WizardNavigationProps> = ({
  onCancel,
  onFinish,
  isFinishing = false,
  canGoNext = true,
  showCancel = true,
}) => {
  const { t } = useTranslation();
  const { currentStep, totalSteps, nextStep, prevStep, isStepValid } = useWizard();

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const canContinue = isStepValid(currentStep) && canGoNext;

  const handleNext = () => {
    if (isLastStep) {
      onFinish();
    } else {
      nextStep();
    }
  };

  return (
    <div className="wizard-navigation d-flex justify-content-between align-items-center">
      <div className="wizard-progress">
        <span className="text-muted">
          {t('WIZARD_STEP_PROGRESS', {
            current: currentStep + 1,
            total: totalSteps,
          })}
        </span>
      </div>

      <div className="wizard-buttons d-flex gap-2">
        {showCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={isFinishing}>
            {t('ACTIONS_CANCEL')}
          </Button>
        )}

        {!isFirstStep && (
          <Button variant="ghost" onClick={prevStep} disabled={isFinishing}>
            <IconChevronLeft size={16} />
            {t('ACTIONS_BACK')}
          </Button>
        )}

        <Button intent={isLastStep ? 'success' : 'primary'} onClick={handleNext} disabled={!canContinue || isFinishing} loading={isFinishing}>
          {isLastStep ? t('APP_INSTALL_FORM_SUBMIT_INSTALL') : t('ACTIONS_NEXT')}
          {!isLastStep && <IconChevronRight size={16} />}
        </Button>
      </div>
    </div>
  );
};
