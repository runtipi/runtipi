import clsx from "clsx";
import "./stepper.css";
import { defineStepper } from "@stepperize/react";
import type { Step } from "@stepperize/core";

interface StepperProps {
  steps: Step[];
  stepComponents: React.ReactNode[];
}

interface StepComponentProps {
  currentStep: number;
  isActive: boolean;
  step: Step;
  onStepChange: (step: number) => void;
}

const StepComponent = ({
  currentStep,
  isActive,
  step,
  onStepChange,
}: StepComponentProps) => {
  return (
    <button
      role="tab"
      className={clsx("step-item step-button", isActive && "active")}
      onClick={() => onStepChange(currentStep)}
    >
      <span className="step-item-text">{step.title}</span>
    </button>
  );
};

export const Stepper = ({ steps, stepComponents }: StepperProps) => {
  const { useStepper, utils } = defineStepper(...steps);
  const stepper = useStepper();
  const currentIndex = utils.getIndex(stepper.current.id);

  return (
    <div>
      <div className="steps steps-counter w-full">
        {steps.map((step, index) => (
          <StepComponent
            key={index}
            currentStep={index}
            step={step}
            isActive={stepper.current.id === step.id}
            onStepChange={() => stepper.goTo(step.id)}
          />
        ))}
      </div>
      <div className="steps-content">{stepComponents[currentIndex]}</div>
    </div>
  );
};
