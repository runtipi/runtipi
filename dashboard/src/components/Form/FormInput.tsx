import React from 'react';
import { Input } from '@chakra-ui/react';
import clsx from 'clsx';

interface IProps {
  placeholder?: string;
  error?: string;
  type?: Parameters<typeof Input>[0]['type'];
  label: string;
  className?: string;
}

const FormInput: React.FC<IProps> = ({ placeholder, error, type, label, className, ...rest }) => {
  return (
    <div className={clsx('transition-all', className)}>
      <label>{label}</label>
      <Input type={type} placeholder={placeholder} isInvalid={Boolean(error)} {...rest} />
      {error && <span className="text-red-500 text-sm">{error}</span>}
    </div>
  );
};

export default FormInput;
