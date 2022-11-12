import React from 'react';
import { Input } from '@chakra-ui/react';
import clsx from 'clsx';

interface IProps {
  placeholder?: string;
  error?: string;
  type?: Parameters<typeof Input>[0]['type'];
  label?: string;
  className?: string;
  isInvalid?: boolean;
  size?: Parameters<typeof Input>[0]['size'];
  hint?: string;
}

const FormInput: React.FC<IProps> = ({ placeholder, error, type, label, className, isInvalid, size, hint, ...rest }) => {
  return (
    <div className={clsx('transition-all', className)}>
      {label && <label className="mb-1">{label}</label>}
      {hint && <div className="text-sm text-gray-500 mb-1">{hint}</div>}
      <Input type={type} placeholder={placeholder} isInvalid={isInvalid} size={size} {...rest} />
      {isInvalid && <span className="text-red-500 text-sm">{error}</span>}
    </div>
  );
};

export default FormInput;
