import type React from 'react';
import { useEffect } from 'react';
import { useWizard } from './WizardContext';

interface WizardStepProps {
  children: React.ReactNode;
  stepIndex: number;
  title: string;
  description?: string;
  isValid?: boolean;
  className?: string;
}

export const WizardStep: React.FC<WizardStepProps> = ({ children, stepIndex, title, description, isValid = true, className = '' }) => {
  const { currentStep, setStepValid } = useWizard();
  const isActive = currentStep === stepIndex;

  useEffect(() => {
    setStepValid(stepIndex, isValid);
  }, [stepIndex, isValid, setStepValid]);

  if (!isActive) {
    return null;
  }

  return (
    <div className={`wizard-step ${className}`}>
      <div className="wizard-step-header mb-4">
        <h3 className="wizard-step-title">{title}</h3>
        {description && <p className="text-muted wizard-step-description">{description}</p>}
      </div>
      <div className="wizard-step-content">{children}</div>
    </div>
  );
};
