import { SimpleGrid, Text } from '@chakra-ui/react';
import React from 'react';
import { BsCpu } from 'react-icons/bs';
import { FaMemory } from 'react-icons/fa';
import { FiHardDrive } from 'react-icons/fi';
import { SystemInfoResponse } from '../../../generated/graphql';
import SystemStat from '../components/SystemStat';

interface IProps {
  data: SystemInfoResponse;
}

const Dashboard: React.FC<IProps> = ({ data }) => {
  const { disk, memory, cpu } = data;

  // Convert bytes to GB
  const diskFree = Math.round(disk.available / 1024 / 1024 / 1024);
  const diskSize = Math.round(disk.total / 1024 / 1024 / 1024);
  const diskUsed = diskSize - diskFree;
  const percentUsed = Math.round((diskUsed / diskSize) * 100);

  const memoryTotal = Math.round(memory?.total / 1024 / 1024 / 1024);
  const memoryFree = Math.round(memory?.available / 1024 / 1024 / 1024);
  const percentUsedMemory = Math.round(((memoryTotal - memoryFree) / memoryTotal) * 100);

  return (
    <>
      <Text fontSize="3xl" className="font-bold">
        Tipi Dashboard
      </Text>
      <Text fontSize="xl" color="gray.500">
        Welcome home!
      </Text>
      <SimpleGrid className="mt-5" minChildWidth="180px" spacing="20px">
        <SystemStat title="Disk space" metric={`${diskUsed} GB`} subtitle={`Used out of ${diskSize} GB`} icon={FiHardDrive} progress={percentUsed} />
        <SystemStat title="CPU Load" metric={`${cpu.load.toFixed(2)}%`} subtitle="Uninstall apps if there is to much load" icon={BsCpu} progress={cpu.load} />
        <SystemStat title="Memory Used" metric={`${percentUsedMemory}%`} subtitle={`${memoryTotal} GB`} icon={FaMemory} progress={percentUsedMemory} />
      </SimpleGrid>
    </>
  );
};

export default Dashboard;
