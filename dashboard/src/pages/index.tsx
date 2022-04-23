import { Progress, SimpleGrid, Stat, StatHelpText, StatLabel, StatNumber, Text } from '@chakra-ui/react';
import type { NextPage } from 'next';
import { useEffect } from 'react';
import Layout from '../components/Layout';
import { useSytemStore } from '../state/systemStore';
import { BsCpu } from 'react-icons/bs';
import { FiHardDrive } from 'react-icons/fi';
import { FaMemory } from 'react-icons/fa';

const Home: NextPage = () => {
  const { fetchDiskSpace, fetchCpuLoad, fetchMemoryLoad, disk, cpuLoad, memory } = useSytemStore();

  useEffect(() => {
    fetchDiskSpace();
    fetchCpuLoad();
    fetchMemoryLoad();

    const interval = setInterval(() => {
      fetchDiskSpace();
      fetchCpuLoad();
      fetchMemoryLoad();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchCpuLoad, fetchDiskSpace]);

  // Convert bytes to GB
  const diskFree = Math.round(disk.available / 1024 / 1024 / 1024);
  const diskSize = Math.round(disk.size / 1024 / 1024 / 1024);
  const diskUsed = diskSize - diskFree;
  const percentUsed = Math.round((diskUsed / diskSize) * 100);

  const memoryTotal = Math.round(memory?.total / 1024 / 1024 / 1024);
  const memoryUsed = Math.round(memory?.used / 1024 / 1024 / 1024);
  const percentUsedMemory = Math.round((memoryUsed / memoryTotal) * 100);

  return (
    <Layout>
      <Text fontSize="3xl" className="font-bold">
        Tipi Dashboard
      </Text>
      <Text fontSize="xl" color="gray.500">
        Welcome home!
      </Text>
      <SimpleGrid className="mt-5" minChildWidth="180px" spacing="20px">
        <Stat className="border-2 px-5 py-3 rounded-lg">
          <StatLabel>Disk space</StatLabel>
          <StatNumber>{diskUsed} GB</StatNumber>
          <StatHelpText>Used out of {diskSize} GB</StatHelpText>
          <Progress value={percentUsed} size="sm" />
          <FiHardDrive size={30} className="absolute top-3 right-3" />
        </Stat>
        <Stat className="border-2 px-5 py-3 rounded-lg">
          <StatLabel>CPU Load</StatLabel>
          <StatNumber>{cpuLoad.toFixed(2)}%</StatNumber>
          <StatHelpText>Uninstall apps if there is to much load</StatHelpText>
          <Progress value={cpuLoad} size="sm" />
          <BsCpu size={30} className="absolute top-3 right-3" />
        </Stat>
        <Stat className="border-2 px-5 py-3 rounded-lg">
          <StatLabel>Memory Used</StatLabel>
          <StatNumber>{percentUsedMemory}%</StatNumber>
          <StatHelpText>{memoryTotal} GB</StatHelpText>
          <Progress value={percentUsedMemory} size="sm" />
          <FaMemory size={30} className="absolute top-3 right-3" />
        </Stat>
      </SimpleGrid>
    </Layout>
  );
};

export default Home;
