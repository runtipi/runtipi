import React from 'react';
import { Input, Switch } from '@chakra-ui/react';
import clsx from 'clsx';

interface IProps {
  placeholder?: string;
  type?: Parameters<typeof Input>[0]['type'];
  label?: string;
  className?: string;
  size?: Parameters<typeof Input>[0]['size'];
  checked?: boolean;
}

const FormSwitch: React.FC<IProps> = ({ placeholder, type, label, className, size, ...rest }) => {
  return (
    <div className={clsx('transition-all', className)}>
      {label && <label className="mr-2">{label}</label>}
      <Switch isChecked={rest.checked} type={type} placeholder={placeholder} size={size} {...rest} />
    </div>
  );
};

export default FormSwitch;
