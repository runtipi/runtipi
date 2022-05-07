import { Progress, Stat, StatHelpText, StatLabel, StatNumber } from '@chakra-ui/react';
import React from 'react';
import { IconType } from 'react-icons';

interface IProps {
  icon: IconType;
  progress: number;
  title: string;
  subtitle: string;
  metric: string;
}

const SystemStat: React.FC<IProps> = ({ icon: Icon, progress, title, subtitle, metric }) => {
  return (
    <Stat className="border-2 px-5 py-3 rounded-lg">
      <StatLabel>{title}</StatLabel>
      <StatNumber>{metric}</StatNumber>
      <StatHelpText>{subtitle}</StatHelpText>
      <Progress value={progress} size="sm" />
      <Icon size={30} className="absolute top-3 right-3" />
    </Stat>
  );
};

export default SystemStat;
