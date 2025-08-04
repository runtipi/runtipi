import type React from 'react';
import { createContext, useContext, useCallback, useState, useRef } from 'react';
import type { FormValues } from '../install-form/install-form';

interface WizardContextType {
  currentStep: number;
  totalSteps: number;
  formData: Partial<FormValues>;
  setFormData: (data: Partial<FormValues>) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  isStepValid: (step: number) => boolean;
  setStepValid: (step: number, valid: boolean) => void;
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

interface WizardProviderProps {
  children: React.ReactNode;
  totalSteps: number;
  initialData?: Partial<FormValues>;
}

export const WizardProvider: React.FC<WizardProviderProps> = ({ children, totalSteps, initialData = {} }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormDataState] = useState<Partial<FormValues>>(initialData);
  const stepValidationRef = useRef<Record<number, boolean>>({});
  const [, forceUpdate] = useState({});

  const setFormData = useCallback((data: Partial<FormValues>) => {
    setFormDataState((prev) => ({ ...prev, ...data }));
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, totalSteps]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 0 && step < totalSteps) {
        setCurrentStep(step);
      }
    },
    [totalSteps],
  );

  const isStepValid = useCallback((step: number) => {
    return stepValidationRef.current[step] ?? false;
  }, []);

  const setStepValid = useCallback((step: number, valid: boolean) => {
    // Only update if the value actually changes
    if (stepValidationRef.current[step] !== valid) {
      stepValidationRef.current[step] = valid;
      forceUpdate({});
    }
  }, []);

  const value = {
    currentStep,
    totalSteps,
    formData,
    setFormData,
    nextStep,
    prevStep,
    goToStep,
    isStepValid,
    setStepValid,
  };

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
};

export const useWizard = () => {
  const context = useContext(WizardContext);
  if (context === undefined) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
};
