import clsx from "clsx";
import { createContext, useContext } from "react";
import "./stepper.css";

const StepperContext = createContext<number>(0);

interface StepperProps {
  currentStep: number;
  children: React.ReactNode;
}

export const Stepper: React.FC<StepperProps> = ({ currentStep, children }) => {
  return (
    <StepperContext.Provider value={currentStep}>
      {children}
    </StepperContext.Provider>
  );
};

interface StepTriggerProps {
  step: number;
  title: string;
  disabled?: boolean;
  onStepChange: (step: number) => void;
}

export const StepTrigger: React.FC<StepTriggerProps> = ({
  step,
  title,
  disabled,
  onStepChange,
}) => {
  const currentStep = useContext(StepperContext);
  return (
    <li
      className={clsx(
        "breadcrumb-item ",
        currentStep === step && "active",
        disabled && "disabled"
      )}
      onClick={() => onStepChange(step)}
    >
      <a onClick={(e) => e.preventDefault()} className="breadcrumb-item link">
        {title}
      </a>
    </li>
  );
};

export const StepContent: React.FC<{
  step: number;
  children: React.ReactNode;
}> = ({ step, children }) => {
  const currentStep = useContext(StepperContext);
  return currentStep === step ? <div>{children}</div> : null;
};

interface StepTriggerList {
  children: React.ReactNode;
}

export const StepTriggerList: React.FC<StepTriggerList> = ({ children }) => {
  return <ol className="breadcrumb breadcrumb-arrows">{children}</ol>;
};
